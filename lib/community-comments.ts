"use client";

import { avatarForKey } from "@/lib/profile-config";
import {
  getCurrentProfile,
  getCurrentUser,
  getSupabaseAccessToken,
} from "@/lib/profile-store";

export const COMMUNITY_COMMENT_MAX_LENGTH = 200;

const BLOCKED_COMMENT_PATTERNS = [
  /f[\W_]*u[\W_]*c[\W_]*k/i,
  /\bsh[i1]t\w*/i,
  /\bb[i1]tch\w*/i,
  /\basshole\w*/i,
  /\bcunt\w*/i,
  /\bwhore\w*/i,
  /\bslut\w*/i,
  /\bdick\w*/i,
  /\bbastard\w*/i,
  /\bmotherfucker\w*/i,
  /\bfag\w*/i,
  /\bkike\w*/i,
  /\bnazi\w*/i,
  /\bn[i1][\W_]*g[\W_]*g(?:a|er)\w*/i,
  /\bsp[i1]c\w*/i,
  /\bch[i1]nk\w*/i,
  /\bgook\w*/i,
  /\bwetback\w*/i,
  /\bbeaner\w*/i,
  /\btowelhead\w*/i,
  /\braghead\w*/i,
];

type CommunityCommentRow = {
  body: string;
  created_at: string;
  id: string;
  post_id: string;
  user_id: string;
};

type CommunityCommentLikeRow = {
  comment_id: string;
  user_id: string;
};

type CommunityPostLikeRow = {
  post_id: string;
  user_id: string;
};

type CommunityProfileRow = {
  avatar_key: string;
  user_id: string;
  username: string;
};

export type CommunityComment = {
  avatar: string;
  body: string;
  createdAt: string;
  id: string;
  isOwnComment: boolean;
  likeCount: number;
  likedByCurrentUser: boolean;
  postId: string;
  userId: string;
  username: string;
};

export type CommunityPostLikeSummary = {
  likedByCurrentUser: boolean;
  likeCount: number;
  postId: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  return {
    key,
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`,
  };
}

async function authHeaders() {
  const config = getSupabaseConfig();
  const accessToken = await getSupabaseAccessToken();
  const token = accessToken ?? config?.key;

  if (!config || !token) {
    throw new Error("Supabase is not configured.");
  }

  return {
    apikey: config.key,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function supabaseFetch<T>(path: string, options: RequestInit = {}) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  let response: Response;

  try {
    response = await fetch(`${config.restUrl}${path}`, {
      ...options,
      headers: {
        ...(await authHeaders()),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Could not reach PopScore community services.");
  }

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

  return response.json() as Promise<T>;
}

async function readSupabaseRestError(response: Response, fallback: string) {
  let responseText = "";

  try {
    responseText = await response.text();
  } catch {
    return fallback;
  }

  if (!responseText) {
    return fallback;
  }

  try {
    const errorBody = JSON.parse(responseText) as {
      code?: string;
      details?: string;
      error?: string;
      error_description?: string;
      hint?: string;
      message?: string;
      msg?: string;
    };
    const message =
      errorBody.error_description ??
      errorBody.message ??
      errorBody.msg ??
      errorBody.error;
    const details = [
      message,
      errorBody.details ? `Details: ${errorBody.details}` : null,
      errorBody.hint ? `Hint: ${errorBody.hint}` : null,
      errorBody.code ? `Code: ${errorBody.code}` : null,
    ].filter(Boolean);

    return details.length ? `${fallback} ${details.join(" ")}` : fallback;
  } catch {
    return `${fallback} ${responseText.slice(0, 1000)}`;
  }
}

function inList(values: string[]) {
  return values.map((value) => encodeURIComponent(value)).join(",");
}

export function normalizeCommunityComment(comment: string) {
  return comment.replace(/\s+/g, " ").trim();
}

export function containsBlockedCommunityLanguage(comment: string) {
  return BLOCKED_COMMENT_PATTERNS.some((pattern) => pattern.test(comment));
}

export function validateCommunityComment(comment: string): {
  body: string | null;
  error: string | null;
} {
  const body = normalizeCommunityComment(comment);

  if (!body) {
    return {
      body: null,
      error: "Write a comment before posting.",
    };
  }

  if (body.length > COMMUNITY_COMMENT_MAX_LENGTH) {
    return {
      body: null,
      error: `Comments must be ${COMMUNITY_COMMENT_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (containsBlockedCommunityLanguage(body)) {
    return {
      body: null,
      error: "Please keep comments clean before posting.",
    };
  }

  return {
    body,
    error: null,
  };
}

function mapComments({
  comments,
  currentUserId,
  likes,
  profiles,
}: {
  comments: CommunityCommentRow[];
  currentUserId?: string | null;
  likes: CommunityCommentLikeRow[];
  profiles: CommunityProfileRow[];
}) {
  const profilesByUserId = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );
  const likeCounts = new Map<string, number>();
  const currentUserLikedCommentIds = new Set<string>();

  likes.forEach((like) => {
    likeCounts.set(like.comment_id, (likeCounts.get(like.comment_id) ?? 0) + 1);

    if (currentUserId && like.user_id === currentUserId) {
      currentUserLikedCommentIds.add(like.comment_id);
    }
  });

  return comments.map((comment) => {
    const profile = profilesByUserId.get(comment.user_id);

    return {
      avatar: avatarForKey(profile?.avatar_key ?? "").icon,
      body: comment.body,
      createdAt: comment.created_at,
      id: comment.id,
      isOwnComment: Boolean(currentUserId && comment.user_id === currentUserId),
      likeCount: likeCounts.get(comment.id) ?? 0,
      likedByCurrentUser: currentUserLikedCommentIds.has(comment.id),
      postId: comment.post_id,
      userId: comment.user_id,
      username: profile?.username ?? "popscorefan",
    };
  });
}

export async function getCommunityComments(postId: string) {
  const currentUser = await getCurrentUser().catch(() => null);
  const comments = await supabaseFetch<CommunityCommentRow[]>(
    `/community_comments?post_id=eq.${encodeURIComponent(
      postId
    )}&select=id,post_id,user_id,body,created_at&order=created_at.asc&limit=50`
  );
  const commentIds = comments.map((comment) => comment.id);
  const commentUserIds = Array.from(
    new Set(comments.map((comment) => comment.user_id))
  );

  if (commentIds.length === 0) {
    return [];
  }

  const [likes, profiles] = await Promise.all([
    supabaseFetch<CommunityCommentLikeRow[]>(
      `/community_comment_likes?comment_id=in.(${inList(
        commentIds
      )})&select=comment_id,user_id`
    ),
    commentUserIds.length > 0
      ? supabaseFetch<CommunityProfileRow[]>(
          `/profiles?user_id=in.(${inList(
            commentUserIds
          )})&select=user_id,username,avatar_key`
        )
      : Promise.resolve([]),
  ]);

  return mapComments({
    comments,
    currentUserId: currentUser?.id,
    likes,
    profiles,
  });
}

export async function getCommunityPostLikeSummary(
  postId: string,
  initialLikeCount: number
): Promise<CommunityPostLikeSummary> {
  const currentUser = await getCurrentUser().catch(() => null);
  const likes = await supabaseFetch<CommunityPostLikeRow[]>(
    `/community_post_likes?post_id=eq.${encodeURIComponent(
      postId
    )}&select=post_id,user_id`
  );

  return {
    likedByCurrentUser: likes.some((like) => like.user_id === currentUser?.id),
    likeCount: initialLikeCount + likes.length,
    postId,
  };
}

export async function addCommunityComment(postId: string, comment: string) {
  const validation = validateCommunityComment(comment);

  if (validation.error || !validation.body) {
    throw new Error(validation.error ?? "Could not post comment.");
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error("Create or sign in to your PopFile to comment.");
  }

  await supabaseFetch<CommunityCommentRow[]>("/community_comments", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      body: validation.body,
      post_id: postId,
      user_id: profile.user_id,
    }),
  });

  return getCommunityComments(postId);
}

export async function toggleCommunityPostLike(
  summary: CommunityPostLikeSummary,
  initialLikeCount: number
) {
  const currentUser = await getCurrentUser().catch(() => null);

  if (!currentUser) {
    throw new Error("Create or sign in to your PopFile to like posts.");
  }

  if (summary.likedByCurrentUser) {
    await supabaseFetch<null>(
      `/community_post_likes?post_id=eq.${encodeURIComponent(
        summary.postId
      )}&user_id=eq.${encodeURIComponent(currentUser.id)}`,
      {
        method: "DELETE",
        headers: {
          Prefer: "return=minimal",
        },
      }
    );
  } else {
    await supabaseFetch<null>(
      "/community_post_likes?on_conflict=post_id,user_id",
      {
        method: "POST",
        headers: {
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify({
          post_id: summary.postId,
          user_id: currentUser.id,
        }),
      }
    );
  }

  return getCommunityPostLikeSummary(summary.postId, initialLikeCount);
}

export async function toggleCommunityCommentLike(comment: CommunityComment) {
  const currentUser = await getCurrentUser().catch(() => null);

  if (!currentUser) {
    throw new Error("Create or sign in to your PopFile to like comments.");
  }

  if (comment.userId === currentUser.id) {
    throw new Error("You can only like someone else's comment.");
  }

  if (comment.likedByCurrentUser) {
    await supabaseFetch<null>(
      `/community_comment_likes?comment_id=eq.${encodeURIComponent(
        comment.id
      )}&user_id=eq.${encodeURIComponent(currentUser.id)}`,
      {
        method: "DELETE",
        headers: {
          Prefer: "return=minimal",
        },
      }
    );
  } else {
    await supabaseFetch<null>(
      "/community_comment_likes?on_conflict=comment_id,user_id",
      {
        method: "POST",
        headers: {
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify({
          comment_id: comment.id,
          user_id: currentUser.id,
        }),
      }
    );
  }

  return getCommunityComments(comment.postId);
}
