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
  await page.getByLabel("Country", { exact: true }).click();
  await page.getByRole("button", { name: "Canada", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Streaming platforms" }).click();
  await page.getByRole("checkbox", { name: "Netflix", exact: true }).click();
  await page.getByRole("checkbox", { name: "Prime Video", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Netflix", exact: true })).toBeChecked();
  await page.locator("details").filter({ has: page.locator("summary").filter({ hasText: "Streaming platforms" }) }).press("Escape");
  const request = page.waitForRequest(req => {
    const params = new URL(req.url()).searchParams;
    return req.url().includes("/api/streaming?") && params.get("services") === "8,9" && params.get("genre") === "28" && params.get("query") === "Batman";
  });
  await page.getByLabel("Genre", { exact: true }).click();
  await page.getByRole("button", { name: "Action", exact: true }).click();
  await expect(page.getByLabel("Year", { exact: true })).toHaveCount(0);
  await page.getByLabel("Search movies", { exact: true }).fill("Batman");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await request;
  await expect(page.getByText(/No subscription movies match/)).toBeVisible();
  await page.reload();
  await page.locator("summary").filter({ hasText: "Streaming platforms" }).click();
  await expect(page.getByLabel("Country", { exact: true })).toContainText("Canada");
  await expect(page.getByRole("checkbox", { name: "Netflix", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Prime Video", exact: true })).toBeChecked();
  await page.getByLabel("Country", { exact: true }).click();
  await page.getByRole("button", { name: "United Kingdom", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Streaming platforms" }).click();
  await expect(page.getByRole("checkbox", { name: "Netflix", exact: true })).not.toBeChecked();
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
  await page.locator("summary").filter({ hasText: "Streaming platforms" }).click();
  await expect(page.getByRole("checkbox", { name: "Netflix", exact: true })).toBeVisible();
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
  await page.locator("summary").filter({ hasText: "Streaming platforms" }).click();
  await page.getByRole("checkbox", { name: "Netflix", exact: true }).click();
  await page.locator("details").filter({ has: page.locator("summary").filter({ hasText: "Streaming platforms" }) }).press("Escape");
  await expect(page.getByRole("link", { name: "Rate First Movie", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("link", { name: "Rate Second Movie", exact: true })).toBeVisible();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/streaming-mobile.png", fullPage: true });
});

test("streaming groups channel versions and restores an old channel selection", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("popscore.streaming.v1", JSON.stringify({ country: "US", services: ["3"] })));
  await page.route("**/api/streaming?*", route => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: params.get("mode") === "providers" ? { providers: [
      { provider_id: 2, provider_name: "Paramount+ Amazon Channel" },
      { provider_id: 1, provider_name: "Paramount+" },
      { provider_id: 3, provider_name: "Paramount+ Apple TV Channel" },
    ] } : { movies: [], totalPages: 1 } });
  });
  await page.goto("/streaming");
  await page.locator("summary").filter({ hasText: "Streaming platforms" }).click();
  await expect(page.getByRole("checkbox", { name: "Paramount+", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Amazon Channel|Apple TV Channel/ })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("popscore.streaming.v1")!).services)).toEqual(["1"]);
});



test("clearing dropdown selections remains cleared after reload", async ({ page }) => {
  await page.route("**/api/streaming?*", route => route.fulfill({ json:
    new URL(route.request().url()).searchParams.get("mode") === "providers"
      ? { providers: [{ provider_id: 8, provider_name: "Netflix" }] }
      : { movies: [], totalPages: 1 }
  }));
  await page.goto("/streaming");
  await page.locator("summary").filter({ hasText: "Streaming platforms" }).click();
  await page.getByRole("checkbox", { name: "Netflix", exact: true }).check();
  await page.locator("details").filter({ has: page.locator("summary").filter({ hasText: "Streaming platforms" }) }).press("Escape");
  await page.getByRole("button", { name: /Clear Service Selection/ }).click();
  await page.reload();
  await page.locator("summary").filter({ hasText: "Streaming platforms" }).click();
  await expect(page.getByRole("checkbox", { name: "Netflix", exact: true })).not.toBeChecked();
  await expect(page.getByText("Streaming availability provided by JustWatch via TMDB.")).toHaveCount(0);
  await expect(page.getByText(/Catalogs vary by country/)).toBeVisible();
});




test("featured services stay compact while all providers remain searchable", async ({ page }) => {
 await page.route("**/api/streaming?*", route => route.fulfill({ json:
  new URL(route.request().url()).searchParams.get("mode") === "providers"
   ? { providers: [{ provider_id: 8, provider_name: "Netflix" }, { provider_id: 9, provider_name: "Prime Video" }, { provider_id: 87, provider_name: "Acorn TV" }] }
   : { movies: [], totalPages: 1 }
 }));
 await page.goto("/streaming");
 await page.locator("summary").filter({ hasText: "Streaming platforms" }).click();
 await expect(page.getByRole("checkbox", { name: "Acorn TV", exact: true })).toHaveCount(0);
 await page.getByRole("button", { name: "+ More services", exact: true }).click();
 await expect(page.getByRole("checkbox", { name: "Acorn TV", exact: true })).toBeVisible();
 await page.getByRole("button", { name: "− Fewer services", exact: true }).click();
 await page.getByPlaceholder("Search streaming services").fill("Acorn");
 await page.getByRole("checkbox", { name: "Acorn TV", exact: true }).check();
 await page.getByPlaceholder("Search streaming services").fill("");
 await expect(page.getByRole("checkbox", { name: "Acorn TV", exact: true })).toBeChecked();
});
