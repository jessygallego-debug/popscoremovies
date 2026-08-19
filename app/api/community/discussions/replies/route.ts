import { NextResponse } from "next/server";
import { isPlaceholderCommunityDiscussionId } from "@/lib/community-discussions";

type DiscussionReplyRequest = {
  body?: string;
  discussionId?: string;
  replyId?: string;
};

type DiscussionRow = {
  comment_count: number | null;
  id: string;
  user_id: string;
};

type SupabaseAuthUser = {
  email?: string;
  id: string;
};

const MAX_REPLY_LENGTH = 1200;

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

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim();
}

async function readSupabaseRestError(response: Response, fallback: string) {
  const responseText = await response.text().catch(() => "");

  return responseText ? `${fallback} ${responseText.slice(0, 1000)}` : fallback;
}

async function supabaseServiceFetch<T>(
  path: string,
  options: RequestInit = {}
) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.restUrl}${path}`, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(
      await readSupabaseRestError(
        response,
        `Supabase request failed with ${response.status}.`
      )
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  const responseText = await response.text();

  if (!responseText) {
    return null as T;
  }

  return JSON.parse(responseText) as T;
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

async function getDiscussion(discussionId: string) {
  const params = new URLSearchParams({
    id: `eq.${discussionId}`,
    limit: "1",
    select: "id,user_id,comment_count",
  });
  const rows = await supabaseServiceFetch<DiscussionRow[]>(
    `/community_discussions?${params}`
  );

  return rows[0] ?? null;
}

async function saveReply(input: {
  body: string;
  discussionId: string;
  replyId: string;
  userId: string;
}) {
  return supabaseServiceFetch<{ id: string }[]>(
    "/community_discussion_replies?on_conflict=id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify({
        body: input.body,
        discussion_id: input.discussionId,
        id: input.replyId,
        user_id: input.userId,
      }),
    }
  );
}

async function updateDiscussionReplyCount(input: {
  commentCount: number;
  discussionId: string;
}) {
  const nextCount = input.commentCount + 1;

  await supabaseServiceFetch<unknown[]>(
    `/community_discussions?id=eq.${encodeURIComponent(input.discussionId)}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        comment_count: nextCount,
        last_active_at: new Date().toISOString(),
      }),
    }
  );

  return nextCount;
}

export async function POST(request: Request) {
  if (!getSupabaseConfig()) {
    return NextResponse.json({ reason: "missing_supabase_config", skipped: true });
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const authUser = await getAuthUser(accessToken);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | DiscussionReplyRequest
    | null;
  const discussionId = body?.discussionId?.trim() ?? "";
  const replyBody = body?.body?.trim() ?? "";
  const replyId = body?.replyId?.trim() ?? "";

  if (
    !discussionId ||
    !replyId ||
    !replyBody ||
    replyBody.length > MAX_REPLY_LENGTH ||
    isPlaceholderCommunityDiscussionId(discussionId)
  ) {
    return NextResponse.json(
      { error: "Invalid discussion reply." },
      { status: 400 }
    );
  }

  const discussion = await getDiscussion(discussionId).catch(() => null);

  if (!discussion) {
    return NextResponse.json(
      { error: "Discussion not found." },
      { status: 404 }
    );
  }

  const insertedReplies = await saveReply({
    body: replyBody,
    discussionId,
    replyId,
    userId: authUser.id,
  }).catch(() => []);

  if (insertedReplies.length === 0) {
    return NextResponse.json({
      commentCount: discussion.comment_count ?? 0,
      recorded: false,
    });
  }

  const commentCount = await updateDiscussionReplyCount({
    commentCount: discussion.comment_count ?? 0,
    discussionId,
  }).catch(() => discussion.comment_count ?? 0);

  return NextResponse.json({
    commentCount,
    recorded: true,
    recipientUserId: discussion.user_id,
    replyId,
  });
}
