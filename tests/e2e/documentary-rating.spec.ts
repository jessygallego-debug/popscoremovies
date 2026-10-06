import { expect, test } from "@playwright/test";
import { GENRE_RATING_CONFIGS } from "../../lib/genre-rating-config";
import { ratingToPercent } from "../../lib/rating-score";
import { calculateMovieDna, getEligibleMovieDnaRatings, getMovieDnaGenreQuestionAverages, type MovieDnaRating } from "../../lib/movie-dna";
import baseline from "../fixtures/non-documentary-genres.json";
import { getPopScore } from "../../lib/popscore-store";

const questions = GENRE_RATING_CONFIGS.documentary.questions;
const score = (answers: number[]) => questions.reduce((total, question, index) => total + question.weight * ratingToPercent(answers[index], "documentary", questions), 0) * 100;
function documentary(id: string, answer = 3): MovieDnaRating {
  return {
    id, movieId: id, movieTitle: `Documentary ${id}`, genre: "documentary", popscore: score([answer, answer, answer, answer]),
    created_at: "2026-10-06T12:00:00Z", updated_at: "2026-10-06T12:00:00Z",
    ratings: Object.fromEntries(questions.map(question => [question.key, answer])), weights: [...questions],
  };
}

test.describe("Documentary scoring", () => {
  test("uses exactly the four agreed questions and weights", () => {
    expect(questions.map(({ key, weight }) => ({ key, weight }))).toEqual([
      { key: "story", weight: 0.35 }, { key: "informativeValue", weight: 0.35 },
      { key: "presentation", weight: 0.2 }, { key: "rewatchability", weight: 0.1 },
    ]);
    expect(questions.reduce((sum, question) => sum + question.weight, 0)).toBeCloseTo(1);
  });
  test("normalizes endpoints and every intermediate answer", () => {
    for (let answer = 1; answer <= 5; answer++) expect(score(Array(4).fill(answer))).toBeCloseTo((answer - 1) * 25);
    expect(score([5, 4, 4, 2])).toBeCloseTo(78.75);
    expect(Math.round(score([5, 4, 4, 2]))).toBe(79);
    for (let a = 1; a <= 5; a++) for (let b = 1; b <= 5; b++) for (let c = 1; c <= 5; c++) for (let d = 1; d <= 5; d++) {
      const answers = [a, b, c, d];
      expect(score(answers)).toBeGreaterThanOrEqual(0);
      expect(score(answers)).toBeLessThanOrEqual(100);
      for (let index = 0; index < 4; index++) if (answers[index] < 5) {
        const increased = [...answers]; increased[index]++;
        expect(score(increased)).toBeGreaterThan(score(answers));
      }
    }
  });
  test("preserves every other genre's exact configuration and scale", () => {
    const { documentary: ignored, ...otherGenres } = GENRE_RATING_CONFIGS;
    expect(ignored).toBeDefined();
    expect(otherGenres).toEqual(baseline);
    for (const [genre, config] of Object.entries(otherGenres)) {
      for (const [answer, percent] of [[1, 0], [1.5, 0.2], [2, 0.4], [3, 0.6], [4, 0.8], [5, 1]])
        expect(ratingToPercent(answer, genre, config.questions)).toBeCloseTo(percent);
    }
    const historicQuestions = ["story", "acting", "rewatchability", "informativeValue", "impact"].map(key => ({ key }));
    expect(ratingToPercent(2, "documentary", historicQuestions)).toBe(0.4);
    expect(ratingToPercent(2, "documentary", questions)).toBe(0.25);
  });
  test("counts complete documentaries toward Movie DNA without inventing Acting answers", () => {
    const docs = [1, 2, 3, 4, 5].map(id => documentary(String(id)));
    const dna = calculateMovieDna(docs);
    expect(dna.eligibleRatings).toHaveLength(5);
    expect(dna.personality).toBe("Balanced Movie Fan");
    expect(dna.personalityDescription).not.toContain("performance");
    expect(dna.actingAverage).toBe(0);
    expect(getMovieDnaGenreQuestionAverages(docs, "documentary").map(trait => trait.percent)).toEqual([50, 50, 50, 50]);
    docs[0].ratings.acting = 1;
    expect(calculateMovieDna(docs).actingAverage).toBe(0);
    delete docs[0].ratings.presentation;
    expect(getEligibleMovieDnaRatings(docs)).toHaveLength(4);
  });
  test("community scores use the documentary scale and preserve historic ratings", async () => {
    const originalFetch = globalThis.fetch;
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.invalid";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
    const current = { id: "new", movie_id: "doc-scale-fixture", created_at: "2026-10-06", genre: "documentary", weights: questions, ratings: { story: 2, informativeValue: 2, presentation: 2, rewatchability: 2 } };
    const historic = { ...current, id: "old", weights: [{ key: "story", weight: 0.3 }, { key: "acting", weight: 0.2 }, { key: "rewatchability", weight: 0.1 }, { key: "informativeValue", weight: 0.25 }, { key: "impact", weight: 0.15 }], ratings: { story: 2, acting: 2, rewatchability: 2, informativeValue: 2, impact: 2 } };
    globalThis.fetch = async input => new Response(JSON.stringify(String(input).includes("/movie_ratings?") ? [current, historic] : []), { status: 200 });
    try {
      expect(await getPopScore(current.movie_id)).toEqual({ count: 2, score: 33 });
    } finally {
      globalThis.fetch = originalFetch;
      if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
  });
});

test.describe("Documentary form", () => {
  test("shows four questions and previews the agreed scores", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/rate?genre=documentary");
    // Wait for React to attach handlers to the server-rendered form.
    await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some(button => Object.keys(button).some(key => key.startsWith("__reactProps"))));
    for (const question of questions) await expect(page.getByText(question.name, { exact: true })).toBeVisible();
    await expect(page.getByText("Acting", { exact: true })).toHaveCount(0);
    for (const [answer, expected] of [[1, 0], [2, 25], [3, 50], [4, 75], [5, 100]]) {
      const buttons = page.getByRole("button").filter({ has: page.locator("span", { hasText: new RegExp(`^${answer}$`) }) });
      await expect(buttons).toHaveCount(4);
      for (let index = 0; index < 4; index++) {
        await buttons.nth(index).click();
        await expect(buttons.nth(index)).toHaveClass(/border-yellow-300/);
      }
      await expect(page.getByRole("heading", { name: `${expected}%`, exact: true })).toBeVisible();
    }
    await page.screenshot({ path: "artifacts/documentary-rating-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText("Presentation / Filmmaking", { exact: true })).toBeVisible();
    await page.screenshot({ path: "artifacts/documentary-rating-mobile.png", fullPage: true });
    expect(errors).toEqual([]);
  });
  test("Horror retains five questions and the existing 40% score for all 2s", async ({ page }) => {
    await page.goto("/rate?genre=horror");
    await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some(button => Object.keys(button).some(key => key.startsWith("__reactProps"))));
    await expect(page.getByText("Acting", { exact: true })).toBeVisible();
    const buttons = page.getByRole("button").filter({ has: page.locator("span", { hasText: /^2$/ }) });
    await expect(buttons).toHaveCount(5);
    for (let index = 0; index < 5; index++) {
      await buttons.nth(index).click();
      await expect(buttons.nth(index)).toHaveClass(/border-yellow-300/);
    }
    await expect(page.getByRole("heading", { name: "40%", exact: true })).toBeVisible();
  });
});

