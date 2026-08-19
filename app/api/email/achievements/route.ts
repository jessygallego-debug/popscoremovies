import { NextResponse } from "next/server";
import {
  ACHIEVEMENTS,
  getAchievementProgress,
  getNextLockedAchievements,
  type Achievement,
  type AchievementProgressSummary,
} from "@/lib/achievements";
import { isPlaceholderCommunityDiscussionId } from "@/lib/community-discussions";
import { genreLabelForKey } from "@/lib/profile-config";
import { SITE_ICON_ALT, SITE_ICON_PATH } from "@/lib/site-metadata";
import { absoluteUrl } from "@/lib/site-url";

type AchievementEmailRequest =
  | { type?: "self" }
  | { recipientUserId?: string; type: "new_follower" }
  | { postId?: string; recipientUserId?: string; type: "post_like" }
  | { commentId?: string; recipientUserId?: string; type: "comment_like" }
  | {
      discussionId?: string;
      recipientUserId?: string;
      replyId?: string;
      type: "discussion_reply";
    };

type ProfileRow = {
  email_achievement_notifications?: boolean | null;
  user_id: string;
  username: string;
};

type SupabaseAuthUser = {
  email?: string;
  id: string;
};

type RatingRow = {
  created_at: string;
  genre: string;
  genre_names: string[] | null;
  id: string;
  popscore: number;
  quick_reaction: string | null;
  rating_source?: string | null;
  ratings: Record<string, number> | null;
  review_comment: string | null;
  weights: { key: string; weight: number }[] | null;
};

type UserAchievementRow = {
  achievement_id: string;
  email_sent_at: string | null;
  unlocked_at: string;
};

type CommunityCommentRow = {
  id: string;
};

type CommunityCommentLikeRow = {
  comment_id: string;
  user_id: string;
};

type CommunityPostLikeRow = {
  post_id: string;
  user_id: string;
};

type CommunityDiscussionRow = {
  comment_count: number | null;
  id: string;
  user_id?: string;
};

type CommunityDiscussionReplyRow = {
  id: string;
};

type FollowRow = {
  id: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const resendApiUrl = "https://api.resend.com/emails";

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

function inList(values: string[]) {
  return values.map((value) => encodeURIComponent(value)).join(",");
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function skipAchievementEmail(
  reason: string,
  details?: Record<string, boolean | number | string>
) {
  console.warn("Achievement email skipped.", {
    ...details,
    reason,
  });

  return NextResponse.json({ reason, skipped: true });
}

async function readSupabaseRestError(response: Response, fallback: string) {
  const responseText = await response.text().catch(() => "");

  if (!responseText) {
    return fallback;
  }

  try {
    const errorBody = JSON.parse(responseText) as {
      code?: string;
      details?: string;
      hint?: string;
      message?: string;
    };
    const message = errorBody.message;
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
    console.warn("Achievement email auth lookup failed.", {
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
    console.warn("Achievement email recipient lookup failed.", {
      status: response.status,
    });
    return null;
  }

  const user = (await response.json()) as SupabaseAuthUser;
  return user.email?.trim() || null;
}

async function getProfileByUserId(userId: string) {
  const params = new URLSearchParams({
    select: "user_id,username,email_achievement_notifications",
    user_id: `eq.${userId}`,
  });
  const rows = await supabaseServiceFetch<ProfileRow[]>(
    `/profiles?${params}`
  ).catch(() => []);

  return rows[0] ?? null;
}

async function followRelationshipExists(input: {
  followedUserId: string;
  followerUserId: string;
}) {
  const params = new URLSearchParams({
    follower_id: `eq.${input.followerUserId}`,
    following_id: `eq.${input.followedUserId}`,
    limit: "1",
    select: "id",
  });
  const rows = await supabaseServiceFetch<FollowRow[]>(
    `/user_follows?${params}`
  ).catch(() => []);

  return rows.length > 0;
}

async function postLikeBelongsToRecipient(input: {
  actorUserId: string;
  postId: string;
  recipientUserId: string;
}) {
  const likeParams = new URLSearchParams({
    post_id: `eq.${input.postId}`,
    user_id: `eq.${input.actorUserId}`,
    limit: "1",
    select: "id",
  });
  const likes = await supabaseServiceFetch<FollowRow[]>(
    `/community_post_likes?${likeParams}`
  ).catch(() => []);

  if (likes.length === 0 || !input.postId.startsWith("rating-")) {
    return false;
  }

  const ratingId = input.postId.replace(/^rating-/, "");
  const ratingParams = new URLSearchParams({
    id: `eq.${ratingId}`,
    limit: "1",
    select: "user_id",
  });
  const ratings = await supabaseServiceFetch<{ user_id: string }[]>(
    `/movie_ratings?${ratingParams}`
  ).catch(() => []);

  return ratings[0]?.user_id === input.recipientUserId;
}

async function commentLikeBelongsToRecipient(input: {
  actorUserId: string;
  commentId: string;
  recipientUserId: string;
}) {
  const likeParams = new URLSearchParams({
    comment_id: `eq.${input.commentId}`,
    user_id: `eq.${input.actorUserId}`,
    limit: "1",
    select: "id",
  });
  const likes = await supabaseServiceFetch<FollowRow[]>(
    `/community_comment_likes?${likeParams}`
  ).catch(() => []);

  if (likes.length === 0) {
    return false;
  }

  const commentParams = new URLSearchParams({
    id: `eq.${input.commentId}`,
    limit: "1",
    select: "user_id",
  });
  const comments = await supabaseServiceFetch<{ user_id: string }[]>(
    `/community_comments?${commentParams}`
  ).catch(() => []);

  return comments[0]?.user_id === input.recipientUserId;
}

async function discussionReplyBelongsToRecipient(input: {
  actorUserId: string;
  discussionId: string;
  recipientUserId: string;
  replyId: string;
}) {
  const replyParams = new URLSearchParams({
    discussion_id: `eq.${input.discussionId}`,
    id: `eq.${input.replyId}`,
    limit: "1",
    select: "id",
    user_id: `eq.${input.actorUserId}`,
  });
  const replies = await supabaseServiceFetch<FollowRow[]>(
    `/community_discussion_replies?${replyParams}`
  ).catch(() => []);

  if (replies.length === 0) {
    return false;
  }

  const discussionParams = new URLSearchParams({
    id: `eq.${input.discussionId}`,
    limit: "1",
    select: "user_id",
  });
  const discussions = await supabaseServiceFetch<{ user_id: string }[]>(
    `/community_discussions?${discussionParams}`
  ).catch(() => []);

  return discussions[0]?.user_id === input.recipientUserId;
}

async function resolveAchievementUserId({
  authUserId,
  body,
}: {
  authUserId: string;
  body: AchievementEmailRequest | null;
}) {
  if (!body || !("type" in body) || !body.type || body.type === "self") {
    return authUserId;
  }

  const getValidRecipientUserId = (recipientUserId?: string) => {
    const trimmedUserId = recipientUserId?.trim() ?? "";

    return isUuid(trimmedUserId) && trimmedUserId !== authUserId
      ? trimmedUserId
      : null;
  };

  if (body.type === "new_follower") {
    const recipientUserId = getValidRecipientUserId(body.recipientUserId);

    if (!recipientUserId) {
      return null;
    }

    return (await followRelationshipExists({
      followedUserId: recipientUserId,
      followerUserId: authUserId,
    }))
      ? recipientUserId
      : null;
  }

  if (body.type === "post_like") {
    const recipientUserId = getValidRecipientUserId(body.recipientUserId);
    const postId = body.postId?.trim() ?? "";

    if (!recipientUserId || !postId) {
      return null;
    }

    const likeBelongsToRecipient = await postLikeBelongsToRecipient({
      actorUserId: authUserId,
      postId,
      recipientUserId,
    });

    return likeBelongsToRecipient ? recipientUserId : null;
  }

  if (body.type === "comment_like") {
    const recipientUserId = getValidRecipientUserId(body.recipientUserId);
    const commentId = body.commentId?.trim() ?? "";

    if (!recipientUserId || !commentId) {
      return null;
    }

    const likeBelongsToRecipient = await commentLikeBelongsToRecipient({
      actorUserId: authUserId,
      commentId,
      recipientUserId,
    });

    return likeBelongsToRecipient ? recipientUserId : null;
  }

  if (body.type === "discussion_reply") {
    const recipientUserId = getValidRecipientUserId(body.recipientUserId);
    const discussionId = body.discussionId?.trim() ?? "";
    const replyId = body.replyId?.trim() ?? "";

    if (!recipientUserId || !discussionId || !replyId) {
      return null;
    }

    const replyBelongsToRecipient = await discussionReplyBelongsToRecipient({
      actorUserId: authUserId,
      discussionId,
      recipientUserId,
      replyId,
    });

    return replyBelongsToRecipient ? recipientUserId : null;
  }

  return null;
}

function rowHasPopScoreRating(row: RatingRow) {
  return Boolean(
    row.weights?.length && row.ratings && Object.keys(row.ratings).length > 0
  );
}

function localDateKey(date: string) {
  const nextDate = new Date(date);
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRatingGenres(rating: RatingRow) {
  const genres =
    rating.genre_names && rating.genre_names.length > 0
      ? rating.genre_names
      : [rating.genre];

  return genres
    .map((genre) => genreLabelForKey(genre))
    .filter(Boolean)
    .map((genre) => genre.trim());
}

function getLongestStreak(ratings: RatingRow[]) {
  const dateKeys = Array.from(
    new Set(ratings.map((rating) => localDateKey(rating.created_at)))
  ).sort();

  if (dateKeys.length === 0) {
    return 0;
  }

  let current = 1;
  let longest = 1;

  for (let index = 1; index < dateKeys.length; index += 1) {
    const previous = new Date(`${dateKeys[index - 1]}T00:00:00`);
    const next = new Date(`${dateKeys[index]}T00:00:00`);
    const difference = Math.round((next.getTime() - previous.getTime()) / DAY_MS);

    current = difference === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }

  return longest;
}

function getMaxRatingDaysInMonth(ratings: RatingRow[]) {
  const daysByMonth = new Map<string, Set<string>>();

  ratings.forEach((rating) => {
    const dateKey = localDateKey(rating.created_at);
    const monthKey = dateKey.slice(0, 7);
    const days = daysByMonth.get(monthKey) ?? new Set<string>();

    days.add(dateKey);
    daysByMonth.set(monthKey, days);
  });

  return Math.max(0, ...Array.from(daysByMonth.values()).map((days) => days.size));
}

async function getUserRatings(userId: string) {
  return supabaseServiceFetch<RatingRow[]>(
    `/movie_ratings?user_id=eq.${encodeURIComponent(
      userId
    )}&select=id,genre,genre_names,ratings,weights,popscore,quick_reaction,rating_source,review_comment,created_at&order=updated_at.desc&limit=1000`
  ).catch(() => []);
}

async function getCommunityEngagementStats(userId: string, ratingIds: string[]) {
  const comments = await supabaseServiceFetch<CommunityCommentRow[]>(
    `/community_comments?user_id=eq.${encodeURIComponent(
      userId
    )}&select=id&limit=1000`
  ).catch(() => []);
  const commentIds = comments.map((comment) => comment.id);
  const ratingPostIds = Array.from(
    new Set(ratingIds.filter(Boolean).map((ratingId) => `rating-${ratingId}`))
  );
  const [commentLikes, postLikes] = await Promise.all([
    Promise.all(
      chunkValues(commentIds, 80).map((ids) =>
        supabaseServiceFetch<CommunityCommentLikeRow[]>(
          `/community_comment_likes?comment_id=in.(${inList(
            ids
          )})&select=comment_id,user_id&limit=1000`
        ).catch(() => [])
      )
    ),
    Promise.all(
      chunkValues(ratingPostIds, 80).map((postIds) =>
        supabaseServiceFetch<CommunityPostLikeRow[]>(
          `/community_post_likes?post_id=in.(${inList(
            postIds
          )})&select=post_id,user_id&limit=1000`
        ).catch(() => [])
      )
    ),
  ]);

  return {
    communityCommentCount: comments.length,
    receivedLikeCount: [...commentLikes.flat(), ...postLikes.flat()].filter(
      (like) => like.user_id !== userId
    ).length,
  };
}

async function getCommunityDiscussionStats(userId: string) {
  const [rows, replies] = await Promise.all([
    supabaseServiceFetch<CommunityDiscussionRow[]>(
      `/community_discussions?user_id=eq.${encodeURIComponent(
        userId
      )}&select=id,comment_count&limit=1000`
    ).catch(() => []),
    supabaseServiceFetch<CommunityDiscussionReplyRow[]>(
      `/community_discussion_replies?user_id=eq.${encodeURIComponent(
        userId
      )}&select=id&limit=1000`
    ).catch(() => []),
  ]);
  const realRows = rows.filter(
    (row) => !isPlaceholderCommunityDiscussionId(row.id)
  );

  return {
    discussionCount: realRows.length,
    discussionReplyCount: replies.length,
    maxDiscussionReplyCount: Math.max(
      0,
      ...realRows.map((row) => row.comment_count ?? 0)
    ),
  };
}

async function getFollowStats(userId: string) {
  const [followers, following] = await Promise.all([
    supabaseServiceFetch<FollowRow[]>(
      `/user_follows?following_id=eq.${encodeURIComponent(
        userId
      )}&select=id&limit=1000`
    ).catch(() => []),
    supabaseServiceFetch<FollowRow[]>(
      `/user_follows?follower_id=eq.${encodeURIComponent(
        userId
      )}&select=id&limit=1000`
    ).catch(() => []),
  ]);

  return {
    followerCount: followers.length,
    followingCount: following.length,
  };
}

async function getAchievementSummary(
  userId: string
): Promise<AchievementProgressSummary> {
  const ratings = await getUserRatings(userId);
  const popScoreRatings = ratings.filter(rowHasPopScoreRating);
  const genreCounts = new Map<string, number>();

  popScoreRatings.forEach((rating) => {
    getRatingGenres(rating).forEach((genre) => {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    });
  });

  const weekAgo = Date.now() - 7 * DAY_MS;
  const reviewCommentCount = ratings.filter((rating) =>
    Boolean(rating.review_comment?.trim())
  ).length;
  const movieMatchRatings = popScoreRatings.filter(
    (rating) => rating.rating_source === "movie_match"
  );
  const [communityStats, discussionStats, followStats] = await Promise.all([
    getCommunityEngagementStats(
      userId,
      ratings.map((rating) => rating.id)
    ),
    getCommunityDiscussionStats(userId),
    getFollowStats(userId),
  ]);

  return {
    discussionCount: discussionStats.discussionCount,
    followerCount: followStats.followerCount,
    followingCount: followStats.followingCount,
    maxDiscussionReplyCount: discussionStats.maxDiscussionReplyCount,
    maxRatingDaysInMonth: getMaxRatingDaysInMonth(popScoreRatings),
    maxRatingsInSingleGenre: Math.max(0, ...Array.from(genreCounts.values())),
    movieMatchRating80PlusCount: movieMatchRatings.filter(
      (rating) => Number(rating.popscore) >= 80
    ).length,
    movieMatchRatingsCount: movieMatchRatings.length,
    quickReactionCount: ratings.filter((rating) => Boolean(rating.quick_reaction))
      .length,
    ratingStreakDays: getLongestStreak(popScoreRatings),
    ratings90Plus: popScoreRatings.filter(
      (rating) => Number(rating.popscore) >= 90
    ).length,
    ratingsThisWeek: popScoreRatings.filter(
      (rating) => new Date(rating.created_at).getTime() >= weekAgo
    ).length,
    ratingsUnder50: popScoreRatings.filter(
      (rating) => Number(rating.popscore) < 50
    ).length,
    receivedLikeCount: communityStats.receivedLikeCount,
    reviewOrCommentCount:
      reviewCommentCount +
      communityStats.communityCommentCount +
      discussionStats.discussionReplyCount,
    totalMoviesRated: popScoreRatings.length,
    uniqueGenresRated: genreCounts.size,
  };
}

async function getUserAchievementRows(userId: string) {
  return supabaseServiceFetch<UserAchievementRow[]>(
    `/user_achievements?user_id=eq.${encodeURIComponent(
      userId
    )}&select=achievement_id,unlocked_at,email_sent_at&limit=1000`
  ).catch(() => []);
}

async function saveUnlockedAchievements(userId: string, achievements: Achievement[]) {
  if (achievements.length === 0) {
    return [];
  }

  return supabaseServiceFetch<UserAchievementRow[]>(
    "/user_achievements?on_conflict=user_id,achievement_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify(
        achievements.map((achievement) => ({
          achievement_id: achievement.id,
          user_id: userId,
        }))
      ),
    }
  ).catch((error) => {
    console.warn("Could not save achievement unlocks.", error);
    return [];
  });
}

async function markAchievementEmailSent(userId: string, achievementId: string) {
  await supabaseServiceFetch<unknown[]>(
    `/user_achievements?user_id=eq.${encodeURIComponent(
      userId
    )}&achievement_id=eq.${encodeURIComponent(achievementId)}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        email_sent_at: new Date().toISOString(),
      }),
    }
  ).catch((error) => {
    console.warn("Could not mark achievement email as sent.", error);
  });
}

function nextAchievementRows(
  summary: AchievementProgressSummary,
  unlockedIds: Set<string>
) {
  return getNextLockedAchievements({
    summary,
    unlockedAchievementIds: unlockedIds,
  });
}

function renderNextAchievementsText(
  nextAchievements: ReturnType<typeof nextAchievementRows>
) {
  if (nextAchievements.length === 0) {
    return "You've unlocked every achievement currently available.";
  }

  return nextAchievements
    .map(
      ({ achievement, progress }) =>
        `${achievement.icon} ${achievement.name}: ${achievement.description} (${progress.text})`
    )
    .join("\n");
}

function renderNextAchievementsHtml(
  nextAchievements: ReturnType<typeof nextAchievementRows>
) {
  if (nextAchievements.length === 0) {
    return `
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0">
        You've unlocked every achievement currently available.
      </p>
    `;
  }

  return `
    <div style="display:grid;gap:10px">
      ${nextAchievements
        .map(
          ({ achievement, progress }) => `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:12px 14px">
              <div style="align-items:center;display:flex;gap:10px">
                <div style="background:#020617;border-radius:999px;color:#facc15;font-size:22px;height:40px;line-height:40px;text-align:center;width:40px">${escapeHtml(
                  achievement.icon
                )}</div>
                <div>
                  <p style="color:#0f172a;font-size:15px;font-weight:800;line-height:1.25;margin:0">${escapeHtml(
                    achievement.name
                  )}</p>
                  <p style="color:#64748b;font-size:13px;font-weight:700;line-height:1.35;margin:3px 0 0">${escapeHtml(
                    progress.text
                  )}</p>
                </div>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

async function sendAchievementEmail(input: {
  achievement: Achievement;
  nextAchievements: ReturnType<typeof nextAchievementRows>;
  profileUrl: string;
  recipientName: string;
  to: string;
  userId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "PopScore <onboarding@resend.dev>";

  if (!apiKey) {
    return { reason: "missing_resend_api_key", skipped: true };
  }

  const safeAchievementDescription = escapeHtml(input.achievement.description);
  const safeAchievementIcon = escapeHtml(input.achievement.icon);
  const safeAchievementName = escapeHtml(input.achievement.name);
  const safeLogoAlt = escapeHtml(SITE_ICON_ALT);
  const safeLogoUrl = escapeHtml(absoluteUrl(SITE_ICON_PATH));
  const safeProfileUrl = escapeHtml(input.profileUrl);
  const safeRecipientName = escapeHtml(input.recipientName);
  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `achievement-${input.userId}-${input.achievement.id}`,
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
                <p style="color:#facc15;font-size:12px;font-weight:800;letter-spacing:.18em;margin:0;text-transform:uppercase">Achievement unlocked</p>
              </div>
              <div style="padding:30px 26px 28px;text-align:left">
                <p style="color:#334155;font-size:16px;line-height:1.55;margin:0 0 22px">Hey <strong>@${safeRecipientName}</strong>,</p>
                <h1 style="color:#0f172a;font-size:28px;line-height:1.15;margin:0 0 18px;text-align:center">Congratulations, you unlocked an achievement!</h1>
                <div style="text-align:center">
                  <div style="background:#020617;border:2px solid #facc15;border-radius:999px;color:#facc15;display:inline-block;font-size:42px;height:86px;line-height:86px;text-align:center;width:86px">${safeAchievementIcon}</div>
                  <p style="color:#0f172a;font-size:26px;font-weight:800;line-height:1.2;margin:16px 0 8px">${safeAchievementName}</p>
                  <p style="color:#475569;font-size:16px;line-height:1.55;margin:0 0 24px">${safeAchievementDescription}</p>
                </div>
                <div style="background:#fff7cc;border:1px solid #facc15;border-radius:18px;padding:16px 18px">
                  <p style="color:#0f172a;font-size:16px;font-weight:800;line-height:1.4;margin:0 0 10px">Three more you can unlock</p>
                  ${renderNextAchievementsHtml(input.nextAchievements)}
                </div>
                <div style="margin-top:26px;text-align:center">
                  <a href="${safeProfileUrl}" style="background:#facc15;border-radius:999px;color:#020617;display:inline-block;font-size:16px;font-weight:800;line-height:1;padding:16px 28px;text-decoration:none">View Your PopFile</a>
                </div>
              </div>
            </div>
            <div style="color:#94a3b8;font-size:13px;line-height:1.55;padding:22px 10px 0;text-align:center">
              <strong style="color:#f8fafc">PopScore</strong><br />
              Rate movies. Discover what's next. Join the conversation.
            </div>
          </div>
        </div>
      `,
      subject: `${input.achievement.icon} Achievement unlocked: ${input.achievement.name}`,
      text: `Hey @${input.recipientName},\n\nCongratulations, you unlocked an achievement!\n\n${input.achievement.icon} ${input.achievement.name}\n${input.achievement.description}\n\nThree more you can unlock:\n${renderNextAchievementsText(
        input.nextAchievements
      )}\n\nView Your PopFile: ${input.profileUrl}\n\n-- PopScore\nRate movies. Discover what's next. Join the conversation.`,
      to: input.to,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Resend achievement email request failed.");
  }

  return { skipped: false };
}

export async function POST(request: Request) {
  if (!getSupabaseConfig()) {
    return skipAchievementEmail("missing_supabase_config", {
      hasNextPublicSupabaseKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ),
      hasNextPublicSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServerSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
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
    | AchievementEmailRequest
    | null;
  const userId = await resolveAchievementUserId({
    authUserId: authUser.id,
    body,
  });

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [profile, recipientEmail, existingRows, summary] = await Promise.all([
    getProfileByUserId(userId),
    getAuthUserEmail(userId),
    getUserAchievementRows(userId),
    getAchievementSummary(userId),
  ]);

  if (!profile) {
    return skipAchievementEmail("recipient_profile_missing");
  }

  if (!recipientEmail) {
    return skipAchievementEmail("recipient_email_missing");
  }

  if (profile.email_achievement_notifications === false) {
    return skipAchievementEmail("recipient_email_notifications_disabled");
  }

  const existingRowsByAchievementId = new Map(
    existingRows.map((row) => [row.achievement_id, row])
  );
  const existingAchievementIds = new Set(existingRowsByAchievementId.keys());
  const unlockedAchievements = ACHIEVEMENTS.filter(
    (achievement) => getAchievementProgress(achievement, summary).isUnlocked
  );
  const newlyUnlockedAchievements = unlockedAchievements.filter(
    (achievement) => !existingAchievementIds.has(achievement.id)
  );
  const insertedRows = await saveUnlockedAchievements(
    userId,
    newlyUnlockedAchievements
  );
  const insertedAchievementIds = new Set(
    insertedRows.map((row) => row.achievement_id)
  );
  const achievementIdsToEmail = new Set([
    ...insertedAchievementIds,
    ...unlockedAchievements
      .filter(
        (achievement) =>
          existingRowsByAchievementId.get(achievement.id)?.email_sent_at === null
      )
      .map((achievement) => achievement.id),
  ]);
  const achievementsToEmail = unlockedAchievements.filter((achievement) =>
    achievementIdsToEmail.has(achievement.id)
  );

  if (achievementsToEmail.length === 0) {
    return NextResponse.json({ emailed: 0, skipped: false });
  }

  const unlockedIdsAfterInsert = new Set([
    ...existingAchievementIds,
    ...unlockedAchievements.map((achievement) => achievement.id),
  ]);
  const nextAchievements = nextAchievementRows(summary, unlockedIdsAfterInsert);
  let emailed = 0;

  for (const achievement of achievementsToEmail) {
    try {
      const result = await sendAchievementEmail({
        achievement,
        nextAchievements,
        profileUrl: absoluteUrl(`/profile/${profile.username}`),
        recipientName: profile.username,
        to: recipientEmail,
        userId,
      });

      if (!result.skipped) {
        emailed += 1;
        await markAchievementEmailSent(userId, achievement.id);
      } else {
        console.warn("Achievement email skipped.", {
          achievementId: achievement.id,
          reason: result.reason ?? "email_send_skipped",
        });
      }
    } catch (error) {
      console.warn("Could not send achievement email.", {
        achievementId: achievement.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    emailed,
    skipped: false,
    unlocked: achievementsToEmail.length,
  });
}
