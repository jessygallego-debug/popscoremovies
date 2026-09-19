import { expect, test } from "@playwright/test";
import { getSiteEngagementTotals } from "../../lib/site-stats";
import { getPopScore } from "../../lib/popscore-store";
import { faqSections } from "../../lib/faq-content";

test("engagement and PopScore ignore empty legacy records and never query reactions", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const requested: string[] = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    return Response.json(url.includes("/movie_ratings?") ? [
      { id: "rated", movie_id: "1", user_id: "fan", ratings: { story: 4 }, weights: [{ key: "story", weight: 1 }] },
      { id: "empty", movie_id: "2", user_id: "fan", ratings: {}, weights: [] },
    ] : []);
  };
  try {
    expect(await getSiteEngagementTotals()).toEqual({ totalMoviesRated: 1, totalRatings: 1 });
    expect(await getPopScore("1")).toEqual({ count: 1, score: 80 });
    expect(requested.every((url) => !/reaction|co_star/.test(url))).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});

test("FAQ answers match the visible page and structured data on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/faq");
  await expect(page.getByRole("heading", { name: "Questions About PopScore?" })).toBeVisible();
  const faq = page.locator('script[type="application/ld+json"]');
  const data = JSON.parse((await faq.textContent())!);
  const items = faqSections.flatMap((section) => section.items);
  expect(data.mainEntity.map((item: { name: string; acceptedAnswer: { text: string } }) => ({
    question: item.name, answer: item.acceptedAnswer.text,
  }))).toEqual(items);
  for (const question of ["How is my PopScore calculated?", "What is Movie DNA?", "How do my Top 5 movies work?", "How do I use my Watchlist?"]) {
    const detail = page.locator("details").filter({ has: page.locator("summary", { hasText: question }) });
    await detail.locator("summary").click();
    await expect(detail.locator("p")).toBeVisible();
  }
  await expect(page.getByText(/quick reaction|Loved It|How do reactions work/i)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
