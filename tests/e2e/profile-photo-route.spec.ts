import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { POST } from "../../app/api/profile-photo/route";
import { avatarForKey, profilePhotoUrl } from "../../lib/profile-config";

const userId = "11111111-1111-4111-8111-111111111111";
const publicUrl = "https://example.supabase.co";

async function photoRequest(token = "valid-token") {
  const bytes = await sharp({ create: {
    width: 100, height: 100, channels: 3, background: "#facc15",
  } }).png().toBuffer();
  const form = new FormData();
  form.set("photo", new File([new Uint8Array(bytes)], "profile.png", { type: "image/png" }));
  return new Request("http://localhost/api/profile-photo", {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
  });
}

test.describe("profile photo moderation and upload", () => {
  test.skip(({ browserName }) => browserName !== "chromium");

  test.beforeEach(() => {
    process.env.SUPABASE_URL = publicUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test-key";
    process.env.SUPABASE_PUBLISHABLE_KEY = "public-test-key";
    process.env.OPENAI_API_KEY = "moderation-test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = publicUrl;
  });

  test.afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  test("does not accept arbitrary photo URLs or unauthenticated uploads", async () => {
    expect(profilePhotoUrl("photo:https://unsafe.example/test.webp")).toBeNull();
    expect(avatarForKey("photo:https://unsafe.example/test.webp").key).toBe("clapper");
    const result = await POST(new Request("http://localhost/api/profile-photo", { method: "POST" }));
    expect(result.status).toBe(401);
  });

  test("PopFile edit page remains usable without a photo", async ({ page }) => {
    await page.goto("/profile/edit");
    await expect(page.getByRole("heading", { name: "Create Your PopFile" })).toBeVisible();
    await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  });

  test("signed-in editor offers photo upload and emoji fallback", async ({ page }) => {
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
    await expect(page.getByRole("heading", { name: "Profile Picture" })).toBeVisible();
    await expect(page.getByText("Upload your own photo")).toBeVisible();
    await expect(page.getByText("Or choose an emoji avatar:")).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeEnabled();
    await expect(page.getByAltText("Profile photo")).toHaveAttribute("src", /\/storage\/v1\/object\/public\/profile-photos\//);
    await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  });

  for (const mode of ["flagged", "unavailable", "visual-reject"] as const) {
    test(`rejects ${mode} images before storage`, async () => {
      const originalFetch = global.fetch;
      const calls: string[] = [];
      global.fetch = async (input) => {
        const url = String(input);
        calls.push(url);
        if (url.endsWith("/auth/v1/user")) return Response.json({ id: userId });
        if (url.includes("/rest/v1/profiles?")) return Response.json([{ id: "profile-1", avatar_key: "popcorn" }]);
        if (url.endsWith("/v1/moderations")) {
          if (mode === "unavailable") return new Response(null, { status: 503 });
          return Response.json({ results: [{
            flagged: true,
            categories: mode === "visual-reject" ? { violence: true } : {},
          }] });
        }
        if (url.endsWith("/v1/responses")) {
          return Response.json({ output: [{ content: [{ type: "output_text", text: "REJECT" }] }] });
        }
        throw new Error(`Unexpected request: ${url}`);
      };
      try {
        const result = await POST(await photoRequest());
        expect(result.status).toBe(mode === "unavailable" ? 503 : 422);
        expect(calls.some((url) => url.includes("/storage/v1/object/"))).toBe(false);
        expect(calls.some((url) => url.endsWith("/v1/responses"))).toBe(mode === "visual-reject");
      } finally {
        global.fetch = originalFetch;
      }
    });
  }

  for (const category of ["sexual", "violence/graphic", "hate", "illicit"] as const) {
    test(`blocks ${category} even if it is movie art`, async () => {
      const originalFetch = global.fetch;
      const calls: string[] = [];
      global.fetch = async (input) => {
        const url = String(input);
        calls.push(url);
        if (url.endsWith("/auth/v1/user")) return Response.json({ id: userId });
        if (url.includes("/rest/v1/profiles?")) return Response.json([{ id: "profile-1", avatar_key: "popcorn" }]);
        if (url.endsWith("/v1/moderations")) {
          return Response.json({ results: [{ flagged: true, categories: { [category]: true } }] });
        }
        throw new Error(`Unexpected request: ${url}`);
      };
      try {
        expect((await POST(await photoRequest())).status).toBe(422);
        expect(calls.some((url) => url.endsWith("/v1/responses"))).toBe(false);
        expect(calls.some((url) => url.includes("/storage/v1/object/"))).toBe(false);
      } finally {
        global.fetch = originalFetch;
      }
    });
  }

  test("allows visually approved non-graphic horror with a general violence flag", async () => {
    const originalFetch = global.fetch;
    let uploadedBytes: Uint8Array | undefined;
    const calls: string[] = [];
    global.fetch = async (input, init) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: userId });
      if (url.endsWith("/v1/moderations")) return Response.json({ results: [{ flagged: true, categories: { violence: true } }] });
      if (url.endsWith("/v1/responses")) {
        const body = JSON.parse(String(init?.body)) as { instructions: string };
        expect(body.instructions).toContain("fictional, non-graphic horror movie art");
        return Response.json({ output: [{ content: [{ type: "output_text", text: "ALLOW" }] }] });
      }
      if (url.includes("/rest/v1/profiles?") && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as { avatar_key: string };
        expect(body.avatar_key).toMatch(new RegExp(`^photo:${userId}/[a-f0-9-]+\\.webp$`));
        return Response.json([{ id: "profile-1", user_id: userId, avatar_key: body.avatar_key }]);
      }
      if (url.includes("/rest/v1/profiles?")) return Response.json([{ id: "profile-1", avatar_key: "popcorn" }]);
      if (url.includes("/storage/v1/object/profile-photos/") && init?.method === "POST") {
        uploadedBytes = init.body as Uint8Array;
        return Response.json({ Key: url });
      }
      throw new Error(`Unexpected request: ${url}`);
    };
    try {
      const result = await POST(await photoRequest());
      expect(result.status).toBe(200);
      const data = (await result.json()) as { profile: { avatar_key: string } };
      expect(profilePhotoUrl(data.profile.avatar_key)).toContain("/storage/v1/object/public/profile-photos/");
      expect(uploadedBytes).toBeDefined();
      expect((await sharp(uploadedBytes).metadata()).format).toBe("webp");
      expect(calls.some((url) => url.endsWith("/v1/moderations"))).toBe(true);
      expect(calls.some((url) => url.endsWith("/v1/responses"))).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
