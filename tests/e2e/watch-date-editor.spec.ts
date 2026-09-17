import { expect, test } from "@playwright/test";

test("changing a rating's watched date opens options in the visible viewport", async ({ page }) => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Supabase URL is required to exercise the signed-in rating flow."
  );

  await page.addInitScript(() => {
    localStorage.setItem("popscore_supabase_session", JSON.stringify({
      access_token: "test-token",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    }));
  });
  await page.route("**/auth/v1/user", (route) => route.fulfill({
    contentType: "application/json",
    json: { id: "user-1", email: "fan@example.com" },
  }));
  await page.route(/\/rest\/v1\/.*/, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    let json: unknown = [];

    if (url.includes("/profiles?")) {
      json = [{ id: "profile-1", user_id: "user-1", username: "fan", favorite_genre: "horror" }];
    } else if (url.includes("/movie_ratings?") && method === "POST") {
      json = [{
        ...JSON.parse(route.request().postData() ?? "{}"),
        id: "rating-1", created_at: "2026-09-17", updated_at: "2026-09-17",
      }];
    } else if (url.includes("/user_movie_watches") && method === "POST") {
      json = [{
        ...JSON.parse(route.request().postData() ?? "{}"),
        id: "watch-1", created_at: "2026-09-17", updated_at: "2026-09-17",
      }];
    }

    await route.fulfill({ contentType: "application/json", json });
  });

  await page.goto("/rate?movie=123&genre=horror");
  const scoreButtons = page.locator("button", {
    has: page.locator('img[alt="Extra Buttery rating icon"]'),
  });
  await expect(scoreButtons).toHaveCount(5);
  for (let index = 0; index < 5; index += 1) {
    await scoreButtons.nth(index).click();
  }
  await page.getByRole("button", { name: /Submit Rating/ }).click();
  await expect(page.getByText("Rating saved")).toBeVisible();

  // Reproduce opening the date picker from near the bottom of a long rating page.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("button", { name: "Change date" }).click();
  const dialog = page.getByRole("dialog", { name: "When did you watch it?" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Today", exact: true })).toBeVisible();
  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);
});
