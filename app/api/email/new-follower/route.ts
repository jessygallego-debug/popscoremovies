import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site-url";

type ProfileRow = {
  user_id: string;
  username: string;
};

type SupabaseAuthUser = {
  email?: string;
  id: string;
};

type NewFollowerEmailRequest = {
  followerUserId?: string;
  followerUsername?: string | null;
  followedUserId?: string;
};

const resendApiUrl = "https://api.resend.com/emails";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || !serviceRoleKey) {
    return null;
  }

  const cleanUrl = url.replace(/\/$/, "");

  return {
    authUrl: `${cleanUrl}/auth/v1`,
    key,
    restUrl: `${cleanUrl}/rest/v1`,
    serviceRoleKey,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function getProfileByUserId(userId: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const params = new URLSearchParams({
    select: "user_id,username",
    user_id: `eq.${userId}`,
  });
  const response = await fetch(`${config.restUrl}/profiles?${params}`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return null;
  }

  const rows = (await response.json()) as ProfileRow[];
  return rows[0] ?? null;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim();
}

async function getAuthUser(accessToken: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const response = await fetch(`${config.authUrl}/user`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken}`,
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<SupabaseAuthUser>;
}

async function getAuthUserEmail(userId: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const response = await fetch(
    `${config.authUrl}/admin/users/${encodeURIComponent(userId)}`,
    {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
      next: { revalidate: 0 },
    }
  );

  if (!response.ok) {
    return null;
  }

  const user = (await response.json()) as SupabaseAuthUser;
  return user.email?.trim() || null;
}

async function followRelationshipExists(input: {
  followedUserId: string;
  followerUserId: string;
}) {
  const config = getSupabaseConfig();

  if (!config) {
    return false;
  }

  const params = new URLSearchParams({
    follower_id: `eq.${input.followerUserId}`,
    following_id: `eq.${input.followedUserId}`,
    limit: "1",
    select: "id",
  });
  const response = await fetch(`${config.restUrl}/user_follows?${params}`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return false;
  }

  const rows = (await response.json()) as { id: string }[];
  return rows.length > 0;
}

async function sendResendEmail(input: {
  followedUserId: string;
  followerUserId: string;
  followerName: string;
  profileUrl: string;
  to: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "PopScore <onboarding@resend.dev>";

  if (!apiKey) {
    return { skipped: true };
  }

  const safeFollowerName = escapeHtml(input.followerName);
  const safeProfileUrl = escapeHtml(input.profileUrl);
  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `new-follower-${input.followerUserId}-${input.followedUserId}`,
    },
    body: JSON.stringify({
      from,
      html: `
        <div style="background:#020617;color:#f8fafc;font-family:Arial,sans-serif;padding:32px">
          <div style="margin:0 auto;max-width:560px;border:1px solid rgba(250,204,21,.35);border-radius:24px;padding:28px">
            <p style="color:#facc15;font-size:12px;font-weight:700;letter-spacing:.18em;margin:0 0 18px;text-transform:uppercase">New follower</p>
            <h1 style="font-size:28px;line-height:1.15;margin:0 0 16px">${safeFollowerName} started following you on PopScore.</h1>
            <p style="color:#cbd5e1;font-size:16px;line-height:1.6;margin:0 0 24px">Open PopScore to view their PopFile and see what movies they are rating.</p>
            <a href="${safeProfileUrl}" style="background:#facc15;border-radius:999px;color:#020617;display:inline-block;font-size:15px;font-weight:700;padding:13px 20px;text-decoration:none">View PopFile</a>
          </div>
        </div>
      `,
      subject: `${input.followerName} started following you on PopScore`,
      text: `${input.followerName} started following you on PopScore. View their PopFile: ${input.profileUrl}`,
      to: input.to,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Resend email request failed.");
  }

  return { skipped: false };
}

export async function POST(request: Request) {
  if (!getSupabaseConfig()) {
    return NextResponse.json({ skipped: true });
  }

  const body = (await request.json().catch(() => null)) as
    | NewFollowerEmailRequest
    | null;
  const followerUserId = body?.followerUserId?.trim() ?? "";
  const followedUserId = body?.followedUserId?.trim() ?? "";

  if (!isUuid(followerUserId) || !isUuid(followedUserId)) {
    return NextResponse.json(
      { error: "Invalid follower request." },
      { status: 400 }
    );
  }

  if (followerUserId === followedUserId) {
    return NextResponse.json({ skipped: true });
  }

  const accessToken = getBearerToken(request);
  const authUser = accessToken ? await getAuthUser(accessToken) : null;

  if (authUser?.id !== followerUserId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const hasFollow = await followRelationshipExists({
    followedUserId,
    followerUserId,
  });

  if (!hasFollow) {
    return NextResponse.json({ skipped: true });
  }

  const [followedProfile, followerProfile] = await Promise.all([
    getProfileByUserId(followedUserId),
    getProfileByUserId(followerUserId),
  ]);
  const recipientEmail = await getAuthUserEmail(followedUserId);

  if (!followedProfile || !recipientEmail) {
    return NextResponse.json({ skipped: true });
  }

  const followerName =
    followerProfile?.username ??
    body?.followerUsername?.trim() ??
    "Someone";
  const profileSlug = followerProfile?.username ?? followerUserId;
  const result = await sendResendEmail({
    followedUserId,
    followerUserId,
    followerName,
    profileUrl: absoluteUrl(`/profile/${profileSlug}`),
    to: recipientEmail,
  });

  return NextResponse.json(result);
}
