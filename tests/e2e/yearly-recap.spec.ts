import { expect, test } from "@playwright/test";
import { renderYearlyRecapEmail } from "@/lib/yearly-recap-email";
import type { YearlyMovieActivity } from "@/lib/movie-watch-stats";

const activity: YearlyMovieActivity = {
  averagePopScore: 84,
  biggestMonth: { count: 5, month: 7 },
  estimatedMinutes: 1440,
  highestRatedMovie: {
    created_at: "2026-07-01T00:00:00Z", genre: "Drama", genreNames: ["Drama"], id: "rating-1", movieId: "101", movieTitle: "The Great Movie", popscore: 96, posterPath: null, quick_reaction: "loved_it", ratingSource: null, ratings: {}, releaseDate: null, reviewComment: null, updated_at: "2026-07-01T00:00:00Z", user_id: "user-1", weights: [],
  },
  monthlyCounts: [0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0],
  mostRewatchedMovie: { count: 3, movieId: "101", title: "The Great Movie" },
  rewatches: 2,
  topGenre: "Drama",
  totalWatches: 12,
  uniqueMovies: 10,
  watches: [],
  year: 2026,
};

test("annual recap email summarizes and links to shareable activity", () => {
  const email = renderYearlyRecapEmail({ activity, profileUrl: "https://popscoremovies.com/profile/moviefan?tab=stats&activityYear=2026#movie-activity", unsubscribeUrl: "https://popscoremovies.com/unsubscribe/yearly-recap?token=test", username: "moviefan" });
  expect(email.subject).toBe("🍿 Your 2026 PopScore Movie Recap");
  expect(email.text).toContain("Movies watched: 12");
  expect(email.text).toContain("Highest rated: The Great Movie · 96%");
  expect(email.html).toContain("View &amp; Share My Activity");
  expect(email.html).toContain("activityYear=2026");
  expect(email.html).toContain("Unsubscribe from annual recaps");
});

test("annual recap cron rejects unauthenticated requests", async ({ request }) => {
  const response = await request.get("/api/cron/yearly-recap");
  expect(response.status()).toBe(401);
});

test("annual recap unsubscribe page confirms the request", async ({ page }) => {
  await page.route("**/api/email/yearly-recap/unsubscribe", async (route) => route.fulfill({ contentType: "application/json", json: { unsubscribed: true } }));
  await page.goto("/unsubscribe/yearly-recap?token=test-token");
  await page.getByRole("button", { name: "Unsubscribe" }).click();
  await expect(page.getByText("You are unsubscribed from annual PopScore movie recaps.")).toBeVisible();
});
