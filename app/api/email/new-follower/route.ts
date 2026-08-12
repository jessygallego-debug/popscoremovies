import { NextResponse } from "next/server";
import { avatarForKey } from "@/lib/profile-config";
import { SITE_ICON_ALT, SITE_ICON_PATH } from "@/lib/site-metadata";
import { absoluteUrl } from "@/lib/site-url";

type ProfileRow = {
  avatar_key: string;
  user_id: string;
  username: string;
};

type FollowRow = {
  created_at: string;
  id: string;
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

type NewFollowerEmailResult = {
  reason?: string;
  skipped: boolean;
};

const resendApiUrl = "https://api.resend.com/emails";
const maxFollowAgeMs = 10 * 60 * 1000;

function getSupabaseConfig() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    serviceRoleKey;

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

function skipNewFollowerEmail(
  reason: string,
  details?: Record<string, boolean | number | string>
) {
  console.warn("New follower email skipped.", {
    ...details,
    reason,
  });

  return NextResponse.json({ reason, skipped: true });
}

async function getProfileByUserId(userId: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const params = new URLSearchParams({
    select: "user_id,username,avatar_key",
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
    console.warn("New follower email profile lookup failed.", {
      status: response.status,
    });
    return null;
  }

  const rows = (await response.json()) as ProfileRow[];
  return rows[0] ?? null;
}

async function newFollowerEmailsAreEnabled(userId: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return false;
  }

  const params = new URLSearchParams({
    select: "email_new_follower_notifications",
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
    console.warn("New follower email preference lookup failed.", {
      status: response.status,
    });
    return true;
  }

  const rows = (await response.json()) as {
    email_new_follower_notifications?: boolean | null;
  }[];

  return rows[0]?.email_new_follower_notifications !== false;
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
    console.warn("New follower email auth lookup failed.", {
      status: response.status,
    });
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
    console.warn("New follower email recipient lookup failed.", {
      status: response.status,
    });
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
    select: "id,created_at",
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
    console.warn("New follower email follow lookup failed.", {
      status: response.status,
    });
    return false;
  }

  const rows = (await response.json()) as FollowRow[];
  return rows[0] ?? null;
}

function followWasRecentlyCreated(row: FollowRow) {
  const createdAt = new Date(row.created_at).getTime();

  if (Number.isNaN(createdAt)) {
    return false;
  }

  return Date.now() - createdAt <= maxFollowAgeMs;
}

async function newFollowerEmailWasProcessed(input: {
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
  const response = await fetch(
    `${config.restUrl}/new_follower_email_events?${params}`,
    {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!response.ok) {
    console.warn("New follower email event lookup failed.", {
      status: response.status,
    });
    return false;
  }

  const rows = (await response.json()) as { id: string }[];
  return rows.length > 0;
}

async function markNewFollowerEmailProcessed(input: {
  followedUserId: string;
  followerUserId: string;
}) {
  const config = getSupabaseConfig();

  if (!config) {
    return;
  }

  const response = await fetch(
    `${config.restUrl}/new_follower_email_events?on_conflict=follower_id,following_id`,
    {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify({
        follower_id: input.followerUserId,
        following_id: input.followedUserId,
      }),
      next: { revalidate: 0 },
    }
  );

  if (!response.ok) {
    console.warn("Could not save new follower email event.", {
      status: response.status,
    });
  }
}

async function sendResendEmail(input: {
  followedUserId: string;
  followerUserId: string;
  followerAvatar: string;
  followerName: string;
  profileUrl: string;
  recipientName: string;
  to: string;
}): Promise<NewFollowerEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "PopScore <onboarding@resend.dev>";

  if (!apiKey) {
    return { reason: "missing_resend_api_key", skipped: true };
  }

  const followerHandle = `@${input.followerName}`;
  const recipientHandle = `@${input.recipientName}`;
  const logoUrl = absoluteUrl(SITE_ICON_PATH);
  const safeFollowerAvatar = escapeHtml(input.followerAvatar);
  const safeFollowerHandle = escapeHtml(followerHandle);
  const safeLogoAlt = escapeHtml(SITE_ICON_ALT);
  const safeLogoUrl = escapeHtml(logoUrl);
  const safeProfileUrl = escapeHtml(input.profileUrl);
  const safeRecipientHandle = escapeHtml(recipientHandle);
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
        <div style="background:#020617;margin:0;padding:0">
          <div style="background:#020617;color:#111827;font-family:Arial,Helvetica,sans-serif;margin:0 auto;max-width:600px;padding:32px 18px">
            <div style="padding:0 0 22px;text-align:center">
              <img src="${safeLogoUrl}" width="48" height="48" alt="${safeLogoAlt}" style="border:0;border-radius:14px;display:inline-block;height:48px;object-fit:cover;width:48px" />
              <div style="color:#facc15;font-size:22px;font-weight:800;letter-spacing:.08em;line-height:1;margin-top:10px">POPSCORE</div>
            </div>
            <div style="background:#f8fafc;border:1px solid rgba(250,204,21,.55);border-radius:26px;box-shadow:0 18px 45px rgba(0,0,0,.28);overflow:hidden">
              <div style="background:#071022;padding:24px 24px 18px;text-align:center">
                <p style="color:#facc15;font-size:12px;font-weight:800;letter-spacing:.18em;margin:0;text-transform:uppercase">New follower</p>
              </div>
              <div style="padding:30px 26px 28px;text-align:left">
                <p style="color:#334155;font-size:16px;line-height:1.55;margin:0 0 22px">Hey <strong>${safeRecipientHandle}</strong>,</p>
                <h1 style="color:#0f172a;font-size:28px;line-height:1.15;margin:0 0 22px;text-align:center">You have a new follower!</h1>
                <div style="text-align:center">
                  <div style="background:#fff7cc;border:2px solid #facc15;border-radius:999px;color:#020617;display:inline-block;font-size:34px;height:76px;line-height:76px;text-align:center;width:76px">${safeFollowerAvatar}</div>
                  <p style="color:#0f172a;font-size:22px;font-weight:800;line-height:1.25;margin:14px 0 6px">${safeFollowerHandle}</p>
                  <p style="color:#475569;font-size:16px;line-height:1.55;margin:0 0 24px">is now following you on PopScore.</p>
                </div>
                <p style="color:#334155;font-size:16px;line-height:1.65;margin:0 0 26px">They'll be able to keep up with your latest movie ratings, reactions, and discussions.</p>
                <div style="text-align:center">
                  <a href="${safeProfileUrl}" style="background:#facc15;border-radius:999px;color:#020617;display:inline-block;font-size:16px;font-weight:800;line-height:1;padding:16px 28px;text-decoration:none">View Their Profile</a>
                </div>
                <p style="color:#475569;font-size:15px;line-height:1.6;margin:26px 0 0;text-align:center">See what they're watching and find out if your movie tastes match.</p>
              </div>
            </div>
            <div style="color:#94a3b8;font-size:13px;line-height:1.55;padding:22px 10px 0;text-align:center">
              <strong style="color:#f8fafc">PopScore</strong><br />
              Rate movies. Discover what's next. Join the conversation.
            </div>
          </div>
        </div>
      `,
      subject: `🎬 @${input.followerName} is now following you on PopScore`,
      text: `Hey @${input.recipientName},\n\nYou have a new follower!\n\n@${input.followerName} is now following you on PopScore.\n\nThey'll be able to keep up with your latest movie ratings, reactions, and discussions.\n\nView Their Profile: ${input.profileUrl}\n\nSee what they're watching and find out if your movie tastes match.\n\n-- PopScore\nRate movies. Discover what's next. Join the conversation.`,
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
    return skipNewFollowerEmail("missing_supabase_config", {
      hasNextPublicSupabaseKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ),
      hasNextPublicSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServerSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
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
    return skipNewFollowerEmail("self_follow");
  }

  const accessToken = getBearerToken(request);
  const authUser = accessToken ? await getAuthUser(accessToken) : null;

  if (authUser?.id !== followerUserId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const followRow = await followRelationshipExists({
    followedUserId,
    followerUserId,
  });

  if (!followRow) {
    return skipNewFollowerEmail("follow_not_found");
  }

  if (!followWasRecentlyCreated(followRow)) {
    return skipNewFollowerEmail("follow_too_old");
  }

  const [followedProfile, followerProfile] = await Promise.all([
    getProfileByUserId(followedUserId),
    getProfileByUserId(followerUserId),
  ]);
  const recipientEmail = await getAuthUserEmail(followedUserId);

  if (!followedProfile) {
    return skipNewFollowerEmail("recipient_profile_missing");
  }

  if (!recipientEmail) {
    return skipNewFollowerEmail("recipient_email_missing");
  }

  const canReceiveNewFollowerEmails = await newFollowerEmailsAreEnabled(
    followedUserId
  );

  if (!canReceiveNewFollowerEmails) {
    return skipNewFollowerEmail("recipient_email_notifications_disabled");
  }

  const followerName =
    followerProfile?.username ??
    body?.followerUsername?.trim() ??
    "Someone";
  const profileSlug = followerProfile?.username ?? followerUserId;
  const emailAlreadyProcessed = await newFollowerEmailWasProcessed({
    followedUserId,
    followerUserId,
  });

  if (emailAlreadyProcessed) {
    return skipNewFollowerEmail("email_already_processed");
  }

  try {
    const result = await sendResendEmail({
      followedUserId,
      followerAvatar: avatarForKey(followerProfile?.avatar_key ?? "").icon,
      followerUserId,
      followerName,
      profileUrl: absoluteUrl(`/profile/${profileSlug}`),
      recipientName: followedProfile.username,
      to: recipientEmail,
    });

    if (!result.skipped) {
      await markNewFollowerEmailProcessed({
        followedUserId,
        followerUserId,
      });
    } else {
      console.warn("New follower email skipped.", {
        reason: result.reason ?? "email_send_skipped",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.warn("Could not send new follower email.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json({ reason: "resend_request_failed", skipped: true });
}
