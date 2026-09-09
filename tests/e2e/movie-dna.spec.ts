import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  calculateMovieDna,
  getEligibleMovieDnaRatings,
  getMovieDnaGenreFilters,
  getMovieDnaGenreQuestionAverages,
  getMovieDnaRanking,
  getMovieDnaRatingsForGenre,
  type MovieDnaRating,
} from "../../lib/movie-dna";

const coreWeights = [
  { key: "story", weight: 0.3 },
  { key: "acting", weight: 0.2 },
  { key: "rewatchability", weight: 0.1 },
  { key: "pace", weight: 0.2 },
  { key: "originality", weight: 0.2 },
];

function rating(
  id: string,
  values: {
    acting?: number;
    genre?: string;
    popscore?: number;
    rewatch?: number;
    story?: number;
    updated?: string;
    voiceActing?: number;
  } = {}
): MovieDnaRating {
  const actingKey = values.voiceActing === undefined ? "acting" : "voiceActing";
  return {
    created_at: values.updated ?? `2026-01-${id.padStart(2, "0")}T12:00:00.000Z`,
    genre: values.genre ?? "horror",
    genreNames: [],
    id: `rating-${id}`,
    movieId: id,
    movieTitle: `Movie ${id}`,
    popscore: values.popscore ?? 80,
    posterPath: `/poster-${id}.jpg`,
    ratingSource: null,
    ratings: {
      story: values.story ?? 4,
      [actingKey]: values.voiceActing ?? values.acting ?? 4,
      rewatchability: values.rewatch ?? 4,
      pace: 4,
      originality: 4,
    },
    releaseDate: `202${Number(id) % 6}-01-01`,
    updated_at: values.updated ?? `2026-01-${id.padStart(2, "0")}T12:00:00.000Z`,
    weights: coreWeights.map((question) =>
      question.key === "acting" ? { ...question, key: actingKey } : question
    ),
  };
}

function dnaFor(story: number, acting: number, rewatch: number) {
  return calculateMovieDna(
    [1, 2, 3, 4, 5].map((id) =>
      rating(String(id), { acting, rewatch, story })
    )
  );
}

test.describe("Movie DNA calculations", () => {
  test("assigns all four deterministic personalities", () => {
    expect(dnaFor(5, 3, 2).personality).toBe("Story Seeker");
    expect(dnaFor(3, 5, 2).personality).toBe("Performance Fan");
    expect(dnaFor(3, 2, 5).personality).toBe("Rewatch Enthusiast");
    expect(dnaFor(4, 4, 4).personality).toBe("Balanced Movie Fan");
  });

  test("includes the 0.35 balanced threshold and uses stable order for exact ties", () => {
    expect(dnaFor(4.35, 4, 4).personality).toBe("Balanced Movie Fan");
    const tied = dnaFor(5, 5, 2);
    expect(tied.personality).toBe("Story Seeker");
    expect(tied.strongestTrait).toBe("Storyline");
  });

  test("normalizes Acting and Voice Acting", () => {
    const dna = calculateMovieDna([
      rating("1", { acting: 3 }),
      rating("2", { voiceActing: 5 }),
      rating("3", { acting: 4 }),
      rating("4", { voiceActing: 4 }),
      rating("5", { acting: 4 }),
    ]);
    expect(dna.actingAverage).toBe(4);
  });

  test("requires three ratings for Favorite Genre", () => {
    const twoGenres = calculateMovieDna([
      rating("1", { genre: "horror", popscore: 99 }),
      rating("2", { genre: "horror", popscore: 98 }),
      rating("3", { genre: "comedy" }),
      rating("4", { genre: "drama" }),
      rating("5", { genre: "action" }),
    ]);
    expect(twoGenres.favoriteGenre).toBeNull();

    const eligible = calculateMovieDna([
      rating("1", { genre: "horror", popscore: 80 }),
      rating("2", { genre: "horror", popscore: 80 }),
      rating("3", { genre: "horror", popscore: 80 }),
      rating("4", { genre: "comedy", popscore: 99 }),
      rating("5", { genre: "comedy", popscore: 99 }),
    ]);
    expect(eligible.favoriteGenre?.genre).toBe("Horror");
  });

  test("breaks genre ties by count, highest movie, then alphabetically", () => {
    const dna = calculateMovieDna([
      rating("1", { genre: "horror", popscore: 90 }),
      rating("2", { genre: "horror", popscore: 80 }),
      rating("3", { genre: "horror", popscore: 70 }),
      rating("4", { genre: "action", popscore: 88 }),
      rating("5", { genre: "action", popscore: 82 }),
      rating("6", { genre: "action", popscore: 70 }),
    ]);
    expect(dna.favoriteGenre?.genre).toBe("Horror");

    const alphabetical = calculateMovieDna([
      rating("1", { genre: "horror", popscore: 90 }),
      rating("2", { genre: "horror", popscore: 80 }),
      rating("3", { genre: "horror", popscore: 70 }),
      rating("4", { genre: "action", popscore: 90 }),
      rating("5", { genre: "action", popscore: 80 }),
      rating("6", { genre: "action", popscore: 70 }),
    ]);
    expect(alphabetical.favoriteGenre?.genre).toBe("Action");
  });

  test("ranks category standouts separately from overall favorites", () => {
    const storyStandout = rating("1", {
      acting: 2,
      popscore: 80,
      rewatch: 2,
      story: 5,
    });
    const overallFavorite = rating("2", {
      acting: 5,
      popscore: 96,
      rewatch: 5,
      story: 5,
    });
    const dna = calculateMovieDna([
      storyStandout,
      overallFavorite,
      rating("3"),
      rating("4"),
      rating("5"),
    ]);

    expect(dna.rankings["top-rated"][0].movieId).toBe("2");
    expect(dna.rankings.story[0].movieId).toBe("1");
    expect(dna.rankings.story[0].relevantScore).toBe(5);
    expect(dna.rankings.story[0].standoutScore).toBe(2);
  });

  test("filters rankings by genre without truncating View All results", () => {
    const ratings = [
      rating("1", { genre: "horror", story: 5 }),
      rating("2", { genre: "comedy", story: 5 }),
      rating("3", { genre: "horror", story: 4 }),
    ];
    const horrorMovies = getMovieDnaRanking(ratings, "story", "horror");

    expect(horrorMovies).toHaveLength(2);
    expect(horrorMovies.map((movie) => movie.movieId)).not.toContain("2");
  });

  test("excludes deleted, incomplete, reaction-only, imported-only, and older duplicates", () => {
    const old = rating("same", { updated: "2026-01-01T00:00:00Z" });
    const newest = {
      ...rating("same", { updated: "2026-02-01T00:00:00Z" }),
      id: "newest",
      movieTitle: "Newest",
    };
    const deleted = { ...rating("deleted"), deleted_at: "2026-03-01" };
    const incomplete = { ...rating("incomplete"), ratings: { story: 5 } };
    const reaction = { ...rating("reaction"), ratings: {}, weights: [] };
    const imported = { ...rating("imported"), ratingSource: "letterboxd_import" };
    const eligible = getEligibleMovieDnaRatings([
      old,
      newest,
      deleted,
      incomplete,
      reaction,
      imported,
    ]);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe("newest");
  });

  test("builds a five-question breakdown for a selected genre", () => {
    const horrorRatings = [
      {
        ...rating("1", { genre: "horror" }),
        ratings: {
          acting: 3,
          originality: 4,
          rewatchability: 4,
          scareFactor: 5,
          story: 4,
        },
      },
      {
        ...rating("2", { genre: "horror" }),
        ratings: {
          acting: 5,
          originality: 4,
          rewatchability: 2,
          scareFactor: 3,
          story: 4,
        },
      },
      rating("3", { genre: "comedy" }),
    ];

    expect(getMovieDnaGenreFilters(horrorRatings)).toEqual([
      { count: 1, key: "comedy", label: "Comedy" },
      { count: 2, key: "horror", label: "Horror" },
    ]);
    expect(getMovieDnaGenreQuestionAverages(horrorRatings, "horror")).toEqual([
      { average: 4, key: "story", label: "Storyline" },
      { average: 4, key: "acting", label: "Acting" },
      { average: 3, key: "rewatchability", label: "Rewatch Score" },
      { average: 4, key: "scareFactor", label: "Scare Factor" },
      { average: 4, key: "originality", label: "Originality" },
    ]);
  });

  test("returns the movies represented by a top-genre count", () => {
    const ratings = [
      rating("1", { genre: "horror", popscore: 81 }),
      rating("2", { genre: "comedy", popscore: 99 }),
      rating("3", { genre: "horror", popscore: 93 }),
    ];

    expect(
      getMovieDnaRatingsForGenre(ratings, "Horror").map((movie) => movie.movieId)
    ).toEqual(["3", "1"]);
  });
});

const browserRatings = [
  rating("1", { genre: "horror", popscore: 94, story: 5 }),
  rating("2", { genre: "horror", popscore: 90, story: 5 }),
  rating("3", { genre: "horror", popscore: 88, story: 4 }),
  rating("4", { genre: "comedy", popscore: 82, story: 4 }),
  rating("5", { genre: "comedy", popscore: 78, story: 4 }),
  rating("6", { genre: "drama", popscore: 86, story: 5 }),
];

const hasSupabaseBrowserConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function mockPopFile(page: Page, movieRatings: MovieDnaRating[]) {
  await page.route("**/rest/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split("/").at(-1);
    let json: unknown[] = [];

    if (table === "profiles") {
      json = [
        {
          avatar_key: "popcorn",
          created_at: "2026-01-01T00:00:00Z",
          favorite_genre: "horror",
          id: "profile-1",
          updated_at: "2026-01-01T00:00:00Z",
          user_id: "user-1",
          username: "movie_fan",
        },
      ];
    } else if (table === "movie_ratings") {
      json = movieRatings.map((item) => ({
        created_at: item.created_at,
        genre: item.genre,
        genre_names: item.genreNames,
        id: item.id,
        movie_id: item.movieId,
        movie_title: item.movieTitle,
        popscore: item.popscore,
        poster_path: item.posterPath,
        quick_reaction: null,
        rating_source: item.ratingSource,
        ratings: item.ratings,
        release_date: item.releaseDate,
        review_comment: null,
        updated_at: item.updated_at,
        user_id: "user-1",
        weights: item.weights,
      }));
    }

    await route.fulfill({ contentType: "application/json", json });
  });
  await page.route("https://image.tmdb.org/**", (route) =>
    route.fulfill({
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      ),
      contentType: "image/png",
    })
  );
}

test.describe("Movie DNA PopFile UI", () => {
  test.skip(
    !hasSupabaseBrowserConfig,
    "Requires public Supabase browser configuration."
  );

test("shows the zero and progress unlock states", async ({ page }) => {
  await mockPopFile(page, []);
  await page.goto("/profile/movie_fan#movie-dna");
  await expect(page.getByText("Your Movie DNA is waiting.")).toBeVisible();

  await page.unrouteAll({ behavior: "wait" });
  await mockPopFile(page, browserRatings.slice(0, 3));
  await page.reload();
  await expect(page.getByText("Your Movie DNA is forming.")).toBeVisible();
  await expect(page.getByText("3 of 5 ratings completed")).toBeVisible();
});

test("Stats labels the overview and rating streaks", async ({ page }) => {
  await mockPopFile(page, browserRatings);
  await page.goto("/profile/movie_fan");

  await expect(page.getByText("Longest Streak", { exact: true })).toBeVisible();
  await expect(page.getByText("Current Streak", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Stats", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PopScore Stats" })).toBeVisible();
  await expect(page.getByText(/Current tier: Popcorn Rookie/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "PopFile Stats" })).toHaveCount(0);
  await expect(page.getByText("Rate Different.").first()).toBeVisible();
  await expect(page.getByText(/Watch Better/).first()).toBeVisible();
  await expect(page.getByText("A look at what makes you, you.")).toBeVisible();
  await expect(page.getByText("#1 Genre", { exact: true })).toBeVisible();
  await expect(page.getByText(/You Love/).first()).toBeVisible();
  await expect(page.getByText(/Your Movie Personality/).first()).toBeVisible();
  const navigationLabels = await page
    .getByRole("navigation", { name: "PopFile sections" })
    .locator("button, a")
    .allTextContents();
  expect(navigationLabels.map((label) => label.trim())).toEqual([
    "Stats",
    "Ratings",
    "Reviews",
    "Achievements",
    "Lists",
  ]);
});

test("Ratings tab hides overview panels and filters rating history", async ({ page }) => {
  await mockPopFile(page, browserRatings);
  await page.goto("/profile/movie_fan?tab=ratings");

  const historyHeading = page.getByRole("heading", { name: "Ratings History" });
  const historySection = historyHeading.locator("..");

  await expect(historyHeading).toBeVisible();
  await expect(page.getByRole("heading", { name: "PopFile Stats" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your Movie DNA" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your Movie Rankings" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Achievements" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Recent Activity" })).toHaveCount(0);

  await page.getByLabel("Filter ratings by genre").selectOption("Horror");
  await page.getByLabel("Sort ratings").selectOption("lowest");
  await expect(historySection.locator("article h3")).toHaveCount(3);
  await expect(historySection.locator("article h3").first()).toHaveText("Movie 3");
  await expect(page.getByText("Movie 4", { exact: true })).toHaveCount(0);

  await page.getByLabel("Sort ratings").selectOption("highest");
  await expect(historySection.locator("article h3").first()).toHaveText("Movie 1");

  const firstRatingCard = historySection.locator("article").first();
  const scoreBox = await firstRatingCard.getByText("94%", { exact: true }).boundingBox();
  const shareBox = await firstRatingCard.getByRole("button", { name: "Share My Rating" }).boundingBox();
  const cardBox = await firstRatingCard.boundingBox();
  expect(scoreBox).not.toBeNull();
  expect(shareBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(Math.abs(scoreBox!.y - shareBox!.y)).toBeLessThan(10);
  expect(cardBox!.height).toBeLessThan(140);

  mkdirSync(join(process.cwd(), "artifacts"), { recursive: true });
  await historySection.screenshot({
    path: join(process.cwd(), "artifacts", "ratings-history-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(firstRatingCard.getByRole("button", { name: "Share My Rating" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await historySection.screenshot({
    path: join(process.cwd(), "artifacts", "ratings-history-mobile.png"),
  });
});

test("renders the full Movie DNA, links, filters, and share/download controls", async ({
  page,
}) => {
  const currentRatings = [...browserRatings];
  await mockPopFile(page, currentRatings);
  await page.goto("/profile/movie_fan#movie-dna");
  await expect(page.getByRole("heading", { name: "Your Movie DNA" })).toBeVisible();
  await expect(page.getByText("Story Seeker", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top Genres" })).toBeVisible();
  await page.locator("#movie-dna summary").click();
  await expect(page.getByRole("heading", { name: "How You Rate Movies" })).toBeVisible();

  const ratingBreakdown = page
    .getByRole("heading", { name: "How You Rate Movies" })
    .locator("../..");
  await page.getByLabel("Filter How You Rate Movies by genre").selectOption("horror");
  await expect(ratingBreakdown.getByRole("meter")).toHaveCount(5);
  await expect(page.getByText("Scare Factor", { exact: true })).toBeVisible();
  await expect(page.getByText("Originality", { exact: true })).toBeVisible();
  await expect(page.getByText("Based on your answers for 3 fully rated Horror movies.")).toBeVisible();

  await page.getByRole("button", { name: "Show 3 rated Horror movies" }).click();
  const genreDialog = page.getByRole("dialog", { name: "Horror Movies" });
  await expect(genreDialog).toBeVisible();
  await expect(genreDialog.getByRole("link")).toHaveCount(3);
  await expect(genreDialog.getByText("Movie 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close Horror movies" }).click();
  await expect(genreDialog).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Show 3 rated Horror movies" }).click();
  await expect(genreDialog).toBeVisible();
  const mobileDialog = await genreDialog.locator("section").boundingBox();
  expect(mobileDialog).not.toBeNull();
  expect(mobileDialog!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(genreDialog).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.getByRole("tab", { name: "Acting Standouts" }).click();
  await expect(page.getByRole("tab", { name: "Acting Standouts" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/\/5 Acting$/).first()).toBeVisible();
  await expect(page.locator('a[href^="/movies/"]').first()).toBeVisible();

  const rankings = page
    .getByRole("heading", { name: "Your Movie Rankings" })
    .locator("../..");
  await page.getByLabel("Filter movie rankings by genre").selectOption("comedy");
  await expect(rankings.locator("ol > li")).toHaveCount(2);
  await page.getByLabel("Filter movie rankings by genre").selectOption("all");
  await expect(rankings.locator("ol > li")).toHaveCount(5);
  await page.getByRole("button", { name: "View All 6 Movies" }).click();
  await expect(rankings.locator("ol > li")).toHaveCount(6);
  await page.getByRole("button", { name: "Show Top 5" }).click();
  await expect(rankings.locator("ol > li")).toHaveCount(5);

  await page.getByRole("button", { name: "Share My Movie DNA" }).click();
  await expect(page.getByRole("dialog", { name: "Share Movie DNA" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Image" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("movie-fan-movie-dna.png");
  await page.getByRole("button", { name: "Close share dialog" }).click();

  currentRatings.splice(4);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("popscore-ratings-updated"))
  );
  await expect(page.getByText("Your Movie DNA is forming.")).toBeVisible();
  await expect(page.getByText("4 of 5 ratings completed")).toBeVisible();
});

test("Movie DNA is responsive and produces desktop and mobile screenshots", async ({
  page,
}) => {
  mkdirSync(join(process.cwd(), "artifacts"), { recursive: true });
  const adventureRatings = browserRatings.map((rating) => ({
    ...rating,
    genre: "adventure",
  }));
  await mockPopFile(page, adventureRatings);

  await page.setViewportSize({ width: 1800, height: 1050 });
  await page.goto("/profile/movie_fan#movie-dna");
  const section = page.locator("#movie-dna");
  await expect(section).toBeVisible();
  const favoriteGenre = section.locator("article").first().getByText("Adventure", { exact: true });
  const getFavoriteGenreLineCount = () =>
    favoriteGenre.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    });
  expect(await getFavoriteGenreLineCount()).toBe(1);
  await section.screenshot({ path: join(process.cwd(), "artifacts", "movie-dna-wide-desktop.png") });

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(favoriteGenre).toBeVisible();
  expect(await getFavoriteGenreLineCount()).toBe(1);
  await section.screenshot({ path: join(process.cwd(), "artifacts", "movie-dna-desktop.png") });
  await page.screenshot({ fullPage: true, path: join(process.cwd(), "artifacts", "popfile-overview-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(section).toBeVisible();
  const mobileLayout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => ({
        className: typeof element.className === "string" ? element.className : "",
        right: Math.round(element.getBoundingClientRect().right),
        tagName: element.tagName,
        width: Math.round(element.getBoundingClientRect().width),
      }))
      .filter((element) => element.right > document.documentElement.clientWidth + 1)
      .slice(0, 8),
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(mobileLayout, JSON.stringify(mobileLayout.offenders)).toMatchObject({
    clientWidth: mobileLayout.scrollWidth,
  });
  const collapsedPageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(collapsedPageHeight).toBeLessThan(3300);
  await page.screenshot({ fullPage: true, path: join(process.cwd(), "artifacts", "popfile-overview-mobile.png") });
  await page.locator("#movie-dna summary").click();
  await expect(page.getByRole("tab", { name: "Rewatch Favorites" })).toBeVisible();
  await section.screenshot({ path: join(process.cwd(), "artifacts", "movie-dna-mobile.png") });
});

});
