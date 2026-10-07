import { test, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { resolveMovieRegion, fixedMovieRegion } from "../../lib/movie-region";

test("settings save a fixed country and Automatic restores current location", async ({ page, context }) => {
  let region: string | null = null;
  let failSave = false;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await context.setExtraHTTPHeaders({ "x-vercel-ip-country": "JP", "accept-language": "en-US" });
  await page.addInitScript(() => localStorage.setItem("popscore_supabase_session", JSON.stringify({
    access_token: "fixture-token", expires_at: Math.floor(Date.now() / 1000) + 3600,
    last_used_at: Math.floor(Date.now() / 1000),
  })));
  await page.route("**/auth/v1/user", route => route.fulfill({ json: { id: "region-user", email: "fixture@example.com" } }));
  await page.route("**/rest/v1/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/profiles")) {
      if (route.request().method() === "PATCH") {
        expect(url.searchParams.get("user_id")).toBe("eq.region-user");
        const body = route.request().postDataJSON();
        expect(Object.keys(body)).toEqual(["preferred_movie_region"]);
        if (failSave) return route.fulfill({ status: 500, json: { message: "Region save failed" } });
        region = body.preferred_movie_region;
      }
      return route.fulfill({ json: [{ user_id: "region-user", username: "regionfan", avatar_key: "clapper", favorite_genre: "horror", preferred_movie_region: region }] });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/");
  await expect(page.locator('a[href*="/movies/movies-released-in-jp-"]').first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Movie region" })).toHaveCount(0);
  await page.goto("/movie/123456");
  await expect(page.getByText("Japan", { exact: true }).last()).toBeVisible();
  await page.goto("/profile/edit");
  const country = page.getByRole("combobox", { name: "Movie region" });
  await expect(country).toHaveValue("");
  await country.selectOption("US");
  await page.getByRole("button", { name: "Save movie region", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Movie region saved.");
  await expect.poll(async () => (await context.cookies()).find(cookie => cookie.name === "popscore_movie_region")?.value).toBe("US");
  await page.goto("/");
  await expect(page.locator('a[href*="/movies/movies-released-in-us-"]').first()).toBeVisible();
  await page.goto("/genre/drama");
  await expect(page.locator('a[href*="/movies/movies-released-in-us-"]').first()).toBeVisible();
  await page.goto("/movie/123456");
  await expect(page.getByRole("main").getByText("US", { exact: true })).toBeVisible();
  await page.goto("/profile/edit");
  await expect(country).toHaveValue("US");
  failSave = true;
  await country.selectOption("JP");
  await page.getByRole("button", { name: "Save movie region", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Region save failed");
  expect((await context.cookies()).find(cookie => cookie.name === "popscore_movie_region")?.value).toBe("US");
  failSave = false;
  await country.selectOption("");
  await page.getByRole("button", { name: "Save movie region", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Movie region saved.");
  await expect.poll(async () => (await context.cookies()).some(cookie => cookie.name === "popscore_movie_region")).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/movie-region-settings-mobile.png", fullPage: true });
  await page.goto("/");
  await expect(page.locator('a[href*="/movies/movies-released-in-jp-"]').first()).toBeVisible();
  await context.setExtraHTTPHeaders({ "x-vercel-ip-country": "US" });
  await page.reload();
  await expect(page.locator('a[href*="/movies/movies-released-in-us-"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("automatic follows current location before browser locale", () => {
  assert.equal(resolveMovieRegion(new Headers({ "x-vercel-ip-country": "JP", "accept-language": "en-US" })), "JP");
  assert.equal(resolveMovieRegion(new Headers({ "x-vercel-ip-country": "US", "accept-language": "ja-JP" })), "US");
});
test("saved country stays fixed while traveling", () => {
  assert.equal(resolveMovieRegion(new Headers({ "x-vercel-ip-country": "JP" }), "US"), "US");
  assert.equal(resolveMovieRegion(new Headers({ "x-vercel-ip-country": "US" }), "JP"), "JP");
});
test("automatic and invalid preferences use safe fallbacks", () => {
  assert.equal(fixedMovieRegion("automatic"), "");
  assert.equal(fixedMovieRegion("XX"), "");
  assert.equal(fixedMovieRegion("us"), "US");
  assert.equal(resolveMovieRegion(new Headers({ "x-vercel-ip-country": "XX", "cf-ipcountry": "CA" }), "automatic"), "CA");
  assert.equal(resolveMovieRegion(new Headers({ "accept-language": "en;q=0.9,fr-FR;q=0.8" })), "FR");
  assert.equal(resolveMovieRegion(new Headers()), "US");
});
