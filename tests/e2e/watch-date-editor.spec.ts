import { expect, test, type Page } from "@playwright/test";

async function submitMockRating(page: Page) {
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
}

test("changing a rating's watched date opens options in the visible viewport", async ({ page }) => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Supabase URL is required to exercise the signed-in rating flow."
  );
  await submitMockRating(page);

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

test("rating share dialog uses the story action and places its label under the icon", async ({ page }) => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Supabase URL is required to exercise the signed-in rating flow."
  );
  await submitMockRating(page);

  await page.getByRole("button", { name: "Share My Rating" }).click();
  const dialog = page.getByRole("dialog", { name: /Share your .* rating/ });
  await expect(dialog.getByRole("button", { name: "Share", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Share to Story" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Copy Link" })).toBeVisible();
  const ratingLabel = dialog.getByText("Extra Buttery", { exact: true });
  const icon = ratingLabel.locator("xpath=..").locator("img");
  await expect(icon).toHaveCount(1);

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const iconBounds = await icon.boundingBox();
    const labelBounds = await ratingLabel.boundingBox();
    const scoreBounds = await dialog.getByText("100", { exact: true }).boundingBox();
    expect(iconBounds).not.toBeNull();
    expect(labelBounds).not.toBeNull();
    expect(scoreBounds).not.toBeNull();
    expect(labelBounds!.y).toBeGreaterThanOrEqual(iconBounds!.y + iconBounds!.height - 1);
    expect(labelBounds!.x).toBeGreaterThan(scoreBounds!.x);
  }

  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        document.body.dataset.sharedFileName = data.files?.[0]?.name ?? "";
      },
    });
  });
  await dialog.getByRole("button", { name: "Share", exact: true }).click();
  await expect.poll(() => page.locator("body").getAttribute("data-shared-file-name"))
    .toBe("movie-123-popscore-story.png");
});
