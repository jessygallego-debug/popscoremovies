import { expect, test } from "@playwright/test";
import { avatarForKey, profilePhotoUrl } from "../../lib/profile-config";

const userId = "11111111-1111-4111-8111-111111111111";

test.describe("PopFile avatars", () => {
  test.beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  });

  test.afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  test("rejects arbitrary legacy photo URLs", () => {
    expect(profilePhotoUrl("photo:https://unsafe.example/test.webp")).toBeNull();
    expect(avatarForKey("photo:https://unsafe.example/test.webp").key).toBe("clapper");
  });

  test("offers emoji avatars without photo upload", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("popscore_supabase_session", JSON.stringify({
        access_token: "test-access-token", expires_at: Math.floor(Date.now() / 1000) + 3600,
      }));
    });
    await page.route("**/auth/v1/user", (route) => route.fulfill({
      contentType: "application/json", json: { id: userId, email: "fan@example.com" },
    }));
    await page.route("**/rest/v1/**", (route) => route.fulfill({
      contentType: "application/json",
      json: route.request().url().includes("/profiles?")
        ? [{ id: "profile-1", user_id: userId, username: "movie_fan", avatar_key: "popcorn", favorite_genre: "horror" }]
        : [],
    }));

    await page.goto("/profile/edit");
    await expect(page.getByRole("heading", { name: "Profile Avatar" })).toBeVisible();
    await expect(page.getByText("Choose an emoji avatar:")).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByText("Upload your own photo")).toHaveCount(0);
  });

  test("continues displaying an existing stored photo", async ({ page }) => {
    const photoKey = `photo:${userId}/22222222-2222-4222-8222-222222222222.webp`;
    await page.addInitScript(() => {
      localStorage.setItem("popscore_supabase_session", JSON.stringify({
        access_token: "test-access-token", expires_at: Math.floor(Date.now() / 1000) + 3600,
      }));
    });
    await page.route("**/auth/v1/user", (route) => route.fulfill({
      contentType: "application/json", json: { id: userId, email: "fan@example.com" },
    }));
    await page.route("**/rest/v1/**", (route) => route.fulfill({
      contentType: "application/json",
      json: route.request().url().includes("/profiles?")
        ? [{ id: "profile-1", user_id: userId, username: "movie_fan", avatar_key: photoKey, favorite_genre: "horror" }]
        : [],
    }));

    await page.goto("/profile/edit");
    await expect(page.getByAltText("Profile photo")).toHaveAttribute("src", /\/storage\/v1\/object\/public\/profile-photos\//);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  });
});
