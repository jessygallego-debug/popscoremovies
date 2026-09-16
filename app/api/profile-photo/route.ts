import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const BUCKET = "profile-photos";

type ModerationResult = {
  results?: { flagged?: boolean; categories?: Record<string, boolean | null> }[];
};

class ModerationError extends Error {
  constructor(readonly status: number | null, readonly code: string) {
    super("Profile photo moderation failed.");
  }
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function reviewPhoto(bytes: Buffer, key: string) {
  const imageUrl = `data:image/webp;base64,${bytes.toString("base64")}`;
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  const moderation = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input: [{ type: "image_url", image_url: { url: imageUrl } }],
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!moderation.ok) {
    const failure = (await moderation.json().catch(() => null)) as { error?: { code?: unknown } } | null;
    const rawCode = failure?.error?.code;
    const code = typeof rawCode === "string" && /^[a-z0-9_]{1,64}$/.test(rawCode)
      ? rawCode
      : "upstream_error";
    throw new ModerationError(moderation.status, code);
  }
  const moderationResult = (await moderation.json().catch(() => null)) as ModerationResult | null;
  const result = moderationResult?.results?.[0];
  if (!result || typeof result.flagged !== "boolean") {
    throw new ModerationError(moderation.status, "invalid_response");
  }
  const flaggedCategories = Object.entries(result.categories ?? {})
    .filter(([, isFlagged]) => isFlagged === true)
    .map(([category]) => category);
  // General violence can include fictional, non-graphic horror art. The free
  // moderation model cannot distinguish it from real-world violence, so only
  // this category may pass; graphic violence and all other flags fail closed.
  return !(
    flaggedCategories.some((category) => category !== "violence") ||
    (result.flagged && flaggedCategories.length === 0)
  );
}

export async function POST(request: Request) {
  const baseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const moderationKey = process.env.OPENAI_API_KEY;
  if (!baseUrl || !serviceKey || !publicKey || !moderationKey) {
    return response("Profile photo uploads are not configured yet.", 503);
  }

  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return response("Please sign in to upload a profile photo.", 401);
  if (Number(request.headers.get("content-length")) > MAX_UPLOAD_BYTES + 100_000) {
    return response("Choose an image under 2 MB.", 413);
  }

  const auth = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: { apikey: publicKey, Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!auth?.ok) return response("Please sign in again.", 401);
  const user = (await auth.json()) as { id?: string };
  if (!user.id || !/^[a-f0-9-]{36}$/i.test(user.id)) return response("Invalid account.", 401);

  const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const profileQuery = new URLSearchParams({ user_id: `eq.${user.id}`, select: "id,avatar_key", limit: "1" });
  const profileResponse = await fetch(`${baseUrl}/rest/v1/profiles?${profileQuery}`, {
    headers: serviceHeaders, cache: "no-store",
  }).catch(() => null);
  if (!profileResponse?.ok) return response("Could not verify your PopFile.", 503);
  const profiles = (await profileResponse.json()) as { id: string; avatar_key: string }[];
  if (!profiles[0]) return response("Save your PopFile first, then add a photo.", 409);

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return response("Choose a JPEG, PNG, or WebP image under 2 MB.", 400);
  }

  let bytes: Buffer;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20_000_000 });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || !metadata.width || !metadata.height) {
      return response("The selected file is not a valid image.", 400);
    }
    bytes = await image.rotate().resize(512, 512, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toBuffer();
    if (bytes.length > 1024 * 1024) return response("Processed image is too large. Please choose another.", 413);
  } catch {
    return response("The selected image could not be processed.", 400);
  }

  try {
    if (!(await reviewPhoto(bytes, moderationKey))) {
      return response("This image cannot be used as a public profile photo. Please choose another.", 422);
    }
  } catch (error) {
    const failure = error instanceof ModerationError
      ? error
      : new ModerationError(null, error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network_error");
    console.error("Profile photo moderation failed", { status: failure.status, code: failure.code });
    const detail = failure.status === null ? failure.code : `HTTP ${failure.status}, ${failure.code}`;
    return response(`Image safety review is unavailable (${detail}). Please try again later.`, 503);
  }

  const objectPath = `${user.id}/${crypto.randomUUID()}.webp`;
  const storageUrl = `${baseUrl}/storage/v1/object/${BUCKET}/${objectPath}`;
  const uploaded = await fetch(storageUrl, {
    method: "POST", headers: { ...serviceHeaders, "Content-Type": "image/webp", "Cache-Control": "31536000" }, body: new Uint8Array(bytes),
  }).catch(() => null);
  if (!uploaded?.ok) return response("Could not store the approved photo. Please try again.", 503);

  const avatarKey = `photo:${objectPath}`;
  const saved = await fetch(`${baseUrl}/rest/v1/profiles?user_id=eq.${user.id}`, {
    method: "PATCH",
    headers: { ...serviceHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ avatar_key: avatarKey }),
  }).catch(() => null);
  const savedProfile = saved?.ok
    ? ((await saved.json().catch(() => [])) as { avatar_key?: string }[])[0]
    : null;
  if (savedProfile?.avatar_key !== avatarKey) {
    await fetch(storageUrl, { method: "DELETE", headers: serviceHeaders }).catch(() => null);
    return response("Could not update your PopFile. Please try again.", 503);
  }

  const priorPhoto = profiles[0].avatar_key;
  if (priorPhoto.startsWith(`photo:${user.id}/`) && /^photo:[a-f0-9-]+\/[a-f0-9-]+\.webp$/i.test(priorPhoto)) {
    const oldPath = priorPhoto.slice("photo:".length);
    await fetch(`${baseUrl}/storage/v1/object/${BUCKET}/${oldPath}`, {
      method: "DELETE", headers: serviceHeaders,
    }).catch(() => null);
  }

  return NextResponse.json({ profile: savedProfile });
}
