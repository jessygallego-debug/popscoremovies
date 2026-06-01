import { expect, test } from "@playwright/test";

type RecommendationMovie = {
  genre_ids?: number[];
  original_language?: string;
  release_date?: string;
  title?: string;
};

const blockedSoftGenreIds = [27, 53, 878];

function releaseYear(movie: RecommendationMovie) {
  return movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : null;
}

function hasAllGenreIds(movie: RecommendationMovie, genreIds: number[]) {
  return genreIds.every((genreId) => movie.genre_ids?.includes(genreId));
}

function hasAnyGenreId(movie: RecommendationMovie, genreIds: number[]) {
  return genreIds.some((genreId) => movie.genre_ids?.includes(genreId));
}

test("Discovery defaults to recent, local-language recommendations", async ({
  page,
}) => {
  const recommendationRequests: URL[] = [];

  await page.route("**/api/recommendations?**", async (route) => {
    recommendationRequests.push(new URL(route.request().url()));
    await route.fulfill({
      contentType: "application/json",
      json: {
        highRatedCount: 0,
        message: "",
        mode: "fallback",
        movies: [
          {
            explanation: "Test recommendation",
            genre_ids: [28],
            id: 157336,
            original_language: "en",
            overallPopScore: 90,
            poster_path: null,
            recommendationMode: "fallback",
            release_date: "2014-11-05",
            tasteMatchScore: 90,
            title: "Interstellar",
            totalRatings: 0,
            vote_average: 8.4,
          },
        ],
      },
    });
  });

  await page.goto("/discover");

  await expect(page.getByText("1960s and newer").first()).toBeVisible();
  await expect(page.getByLabel("Include international movies")).not.toBeChecked();
  await expect
    .poll(() =>
      recommendationRequests.at(-1)?.searchParams.get("minReleaseYear")
    )
    .toBe("1960");
  expect(
    recommendationRequests.at(-1)?.searchParams.get("includeInternationalMovies")
  ).toBe("false");
});

test("Discovery controls update recommendation query params", async ({
  page,
}) => {
  const recommendationRequests: URL[] = [];

  await page.route("**/api/recommendations?**", async (route) => {
    recommendationRequests.push(new URL(route.request().url()));
    await route.fulfill({
      contentType: "application/json",
      json: {
        highRatedCount: 0,
        message: "",
        mode: "fallback",
        movies: [],
      },
    });
  });

  await page.goto("/discover");
  await page.getByRole("button", { name: "Fantasy" }).click();
  await expect
    .poll(() => recommendationRequests.at(-1)?.searchParams.get("genre"))
    .toBe("fantasy");

  await page.getByRole("button", { name: "Rom-Com" }).click();
  await expect
    .poll(() => recommendationRequests.at(-1)?.searchParams.get("genre"))
    .toBe("romcom");

  await page.getByRole("button", { name: "Super Hero" }).click();
  await expect
    .poll(() => recommendationRequests.at(-1)?.searchParams.get("genre"))
    .toBe("superhero");

  await page.getByRole("button", { name: "Western" }).click();
  await expect
    .poll(() => recommendationRequests.at(-1)?.searchParams.get("genre"))
    .toBe("western");

  await page.locator("details", { hasText: "1960s and newer" }).click();
  await page.getByRole("button", { name: "2020s and newer" }).click();
  await expect
    .poll(() =>
      recommendationRequests.at(-1)?.searchParams.get("minReleaseYear")
    )
    .toBe("2020");

  await page.getByLabel("Include international movies").check();
  await expect
    .poll(() =>
      recommendationRequests
        .at(-1)
        ?.searchParams.get("includeInternationalMovies")
    )
    .toBe("true");
});

test("Fantasy and Western are rating genres but Super Hero is filter-only", async ({
  page,
}) => {
  await page.goto("/rate?genre=fantasy");

  await expect(page.getByRole("button", { name: "Fantasy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Storyline" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Character" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rewatch Score" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "World Building" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Magic & Wonder" })).toBeVisible();

  await page.goto("/rate?genre=western");

  await expect(page.getByRole("button", { name: "Western" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Storyline" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Character" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rewatch Score" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Western Atmosphere" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Showdowns" })).toBeVisible();

  await page.goto("/rate?genre=superhero");

  await expect(page.getByRole("button", { name: "Super Hero" })).toHaveCount(0);
});

test("My PopFile does not navigate to edit while profile is still loading", async ({
  page,
}) => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Supabase URL is required for the profile loading regression."
  );

  await page.addInitScript(() => {
    window.localStorage.setItem(
      "popscore_supabase_session",
      JSON.stringify({
        access_token: "test-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        last_used_at: Math.floor(Date.now() / 1000),
      })
    );
  });

  await page.route("**/auth/v1/user", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({
      contentType: "application/json",
      json: {
        email: "moviefan@example.com",
        id: "user-1",
      },
    });
  });

  await page.route(/\/rest\/v1\/profiles.*/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fulfill({
      contentType: "application/json",
      json: [
        {
          avatar_key: "clapper",
          created_at: new Date().toISOString(),
          favorite_genre: "horror",
          id: "profile-1",
          include_international_movies: false,
          preferred_movie_custom_year: null,
          preferred_movie_era: "1960",
          preferred_movie_language: "en",
          preferred_movie_region: "US",
          updated_at: new Date().toISOString(),
          user_id: "user-1",
          username: "moviefan",
        },
      ],
    });
  });

  await page.goto("/");

  const loadingPopFile = page.getByRole("button", { name: "My PopFile" });

  await expect(loadingPopFile).toHaveAttribute("aria-busy", "true");
  await loadingPopFile.click();
  await expect(page).not.toHaveURL(/\/profile\/edit/);

  await expect(page.locator("summary", { hasText: "My PopFile" })).toBeVisible();
});

test("notification deep links expand and highlight discussion replies", async ({
  page,
}) => {
  await page.goto(
    "/community/discussions/interstellar-nolan-best?discussionId=interstellar-nolan-best&replyId=reply-interstellar-1#reply-reply-interstellar-1"
  );

  await expect(page.locator("#reply-reply-interstellar-1")).toBeVisible();
  await expect(
    page.locator("#reply-reply-interstellar-1.notification-highlight")
  ).toBeVisible();
});

test("live recommendation API keeps key genre promises", async ({ request }) => {
  test.skip(
    !process.env.TMDB_API_TOKEN,
    "TMDB token is required for live recommendation API checks."
  );

  const checks = [
    {
      genre: "romcom",
      label: "Rom-Com",
      requiresAll: [35, 10749],
      withoutAny: blockedSoftGenreIds,
    },
    {
      genre: "musical",
      label: "Musical",
      withoutAny: blockedSoftGenreIds,
    },
    {
      genre: "family",
      label: "Family",
      requiresAny: [16, 10751],
    },
  ];

  for (const check of checks) {
    const response = await request.get("/api/recommendations", {
      params: {
        genre: check.genre,
        includeInternationalMovies: "false",
        minReleaseYear: "1960",
        preferredLanguage: "en",
        preferredRegion: "US",
      },
    });
    const data = await response.json();
    const movies = (data.movies ?? []) as RecommendationMovie[];

    test.skip(
      movies.length === 0,
      `${check.label} recommendations unavailable in this environment.`
    );

    for (const movie of movies) {
      expect(movie.original_language, movie.title).toBe("en");
      expect(releaseYear(movie), movie.title).toBeGreaterThanOrEqual(1960);

      if (check.requiresAll) {
        expect(hasAllGenreIds(movie, check.requiresAll), movie.title).toBe(true);
      }

      if (check.requiresAny) {
        expect(hasAnyGenreId(movie, check.requiresAny), movie.title).toBe(true);
      }

      if (check.withoutAny) {
        expect(hasAnyGenreId(movie, check.withoutAny), movie.title).toBe(false);
      }
    }
  }
});
