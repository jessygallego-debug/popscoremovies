import { test, expect } from "@playwright/test";

test("streaming remembers selections and combines services with filters", async ({ page }) => {
  await page.route("**/api/streaming?*", async route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("mode") === "providers") return route.fulfill({ json: { providers: [
      { provider_id: 8, provider_name: "Netflix" }, { provider_id: 9, provider_name: "Prime Video" }
    ] } });
    return route.fulfill({ json: { movies: [], totalPages: 1 } });
  });
  await page.goto("/streaming");
  await page.getByLabel("Country", { exact: true }).selectOption("CA");
  await page.getByRole("button", { name: "Netflix", exact: true }).click();
  await page.getByRole("button", { name: "Prime Video", exact: true }).click();
  await expect(page.getByRole("button", { name: "Netflix", exact: true })).toHaveAttribute("aria-pressed", "true");
  const request = page.waitForRequest(req => {
    const params = new URL(req.url()).searchParams;
    return req.url().includes("/api/streaming?") && params.get("services") === "8,9" && params.get("genre") === "28" && params.get("year") === "2020";
  });
  await page.getByLabel("Genre", { exact: true }).selectOption("28");
  await page.getByLabel("Year", { exact: true }).selectOption("2020");
  await request;
  await expect(page.getByText(/No subscription movies match/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Country", { exact: true })).toHaveValue("CA");
  await expect(page.getByRole("button", { name: "Netflix", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Prime Video", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Country", { exact: true }).selectOption("GB");
  await expect(page.getByRole("button", { name: "Netflix", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("streaming recovers from provider errors", async ({ page }) => {
  let failed = true;
  await page.route("**/api/streaming?*", route => route.fulfill(failed
    ? { status: 503, json: { error: "Streaming availability is temporarily unavailable. Please try again." } }
    : { json: { providers: [{ provider_id: 8, provider_name: "Netflix" }] } }));
  await page.goto("/streaming");
  await expect(page.getByRole("alert").first()).toContainText("temporarily unavailable");
  failed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: "Netflix", exact: true })).toBeVisible();
});



test("streaming renders movie cards and paginates on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/streaming?*", route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("mode") === "providers") return route.fulfill({ json: { providers: [{ provider_id: 8, provider_name: "Netflix" }] } });
    const title = params.get("page") === "2" ? "Second Movie" : "First Movie";
    return route.fulfill({ json: { movies: [{ id: params.get("page") === "2" ? 2 : 1, title, overview: "", poster_path: null, backdrop_path: null, popularity: 1, vote_average: 0, release_date: "2020-01-01", genre_ids: [28] }], totalPages: 2 } });
  });
  await page.goto("/streaming");
  await page.getByRole("button", { name: "Netflix", exact: true }).click();
  await expect(page.getByRole("link", { name: "Rate First Movie", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("link", { name: "Rate Second Movie", exact: true })).toBeVisible();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/streaming-mobile.png", fullPage: true });
});
