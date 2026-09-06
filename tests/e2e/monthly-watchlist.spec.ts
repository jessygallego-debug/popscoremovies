import { expect, test } from "@playwright/test";
import { renderMonthlyWatchlistEmail } from "@/lib/monthly-watchlist-email";

const digitalMovie = {
  availabilityType: "rent_buy" as const,
  category: "digital" as const,
  displayOrder: 1,
  movieId: "101",
  movieTitle: "Digital Premiere",
  posterPath: "/digital.jpg",
  provider: null,
  rankingScore: 100,
  releaseDate: "2026-10-01",
  sourceUrl: "https://example.com/digital",
  verifiedAt: "2026-09-30T12:00:00Z",
};

const streamingMovie = {
  availabilityType: "subscription" as const,
  category: "subscription_streaming" as const,
  displayOrder: 1,
  movieId: "202",
  movieTitle: "Streaming Premiere",
  posterPath: "/streaming.jpg",
  provider: "Netflix",
  rankingScore: 90,
  releaseDate: "2026-10-18",
  sourceUrl: "https://example.com/streaming",
  verifiedAt: "2026-09-30T12:00:00Z",
};

test("Monthly Watchlist email distinguishes current and future availability", () => {
  const email = renderMonthlyWatchlistEmail({
    month: 10,
    movies: [digitalMovie, streamingMovie],
    sendDate: "2026-10-01",
    unsubscribeUrl: "https://popscoremovies.com/unsubscribe/test",
    year: 2026,
  });

  expect(email.subject).toBe("🍿 October's PopScore Watchlist Is Here");
  expect(email.text).toContain("Digital Premiere\nAvailable Now\nRent / Buy");
  expect(email.text).toContain(
    "Streaming Premiere\nStreaming October 18\nNetflix"
  );
  expect(email.html).toContain("View on PopScore");
  expect(email.html).toContain("Find My Movie");
  expect(email.html).toContain("Unsubscribe from monthly emails");
  expect(email.html).toContain("https://image.tmdb.org/t/p/w342/digital.jpg");
  expect(email.html).not.toContain("/_next/image");
  expect(email.html).toContain("@media only screen and (max-width:520px)");
  expect(email.html).toContain('width:25%');
  expect(email.html).toContain('width:112px!important');
  expect(email.html).toContain("Included with Subscription");
});

test("Monthly Watchlist cron rejects unauthenticated requests", async ({ request }) => {
  const response = await request.get("/api/cron/monthly-watchlist");
  expect(response.status()).toBe(401);
});

test("Monthly Watchlist unsubscribe page confirms the request", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.route("**/api/email/monthly-watchlist/unsubscribe", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { unsubscribed: true } });
  });

  await page.goto("/unsubscribe/monthly-watchlist?token=test-token");
  await page.getByRole("button", { name: "Unsubscribe" }).click();
  await expect(
    page.getByText("You are unsubscribed from the PopScore Monthly Watchlist.")
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth)
  );
});

test("Monthly Watchlist admin preview shell renders", async ({ page }) => {
  await page.goto("/admin/monthly-watchlist");
  await expect(
    page.getByRole("heading", { name: "The PopScore Monthly Watchlist" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate Draft" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send Test Email" })).toBeVisible();
});
