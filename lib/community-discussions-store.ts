"use client";

import { avatarForKey } from "@/lib/profile-config";
import {
  getCurrentProfile,
  getCurrentUser,
  getSupabaseAccessToken,
  type ProfileRecord,
} from "@/lib/profile-store";
import {
  discussionTypes,
  type CommunityDiscussion,
  type DiscussionType,
} from "@/lib/community-discussions";

export const COMMUNITY_DISCUSSIONS_UPDATED_EVENT =
  "popscore-community-discussions-updated";

type CommunityDiscussionRow = {
  body: string | null;
  comment_count: number | null;
  created_at: string;
  id: string;
  is_spoiler: boolean | null;
  last_active_at: string | null;
  like_count: number | null;
  movie_genres: string[] | null;
  movie_id: string;
  movie_poster_url: string | null;
  movie_title: string;
  movie_year: string | null;
  tags: string[] | null;
  title: string;
  type: string;
  user_id: string;
};

const discussionSelect =
  "id,user_id,movie_id,movie_title,movie_year,movie_poster_url,movie_genres,title,body,type,tags,is_spoiler,comment_count,like_count,created_at,last_active_at";

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
    throw new Error("Could not reach PopScore discussion services.");
  }

  if (!response.ok) {
    throw new Error(
      await readSupabaseRestError(
        response,
        `Discussion request failed with ${response.status}.`
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

function isDiscussionType(value: string): value is DiscussionType {
  return discussionTypes.includes(value as DiscussionType);
}

function uniqueTextValues(values: string[] | null | undefined) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function profileFallbackUsername(userId: string) {
  return `user_${userId.slice(0, 8)}`;
}

function mapDiscussionRow({
  currentProfile,
  profilesByUserId,
  row,
}: {
  currentProfile: ProfileRecord | null;
  profilesByUserId: Map<string, ProfileRecord>;
  row: CommunityDiscussionRow;
}): CommunityDiscussion {
  const profile =
    profilesByUserId.get(row.user_id) ??
    (currentProfile?.user_id === row.user_id ? currentProfile : null);
  const username = profile?.username ?? profileFallbackUsername(row.user_id);
  const movieGenres = uniqueTextValues(row.movie_genres);

  return {
    body: row.body ?? "",
    commentCount: row.comment_count ?? 0,
    createdAt: row.created_at,
    id: row.id,
    isSpoiler: row.is_spoiler ?? false,
    lastActiveAt: row.last_active_at ?? row.created_at,
    likeCount: row.like_count ?? 0,
    movieGenres,
    movieId: row.movie_id,
    moviePosterUrl: row.movie_poster_url,
    movieTitle: row.movie_title,
    movieYear: row.movie_year ?? "",
    startedByAvatarUrl: avatarForKey(profile?.avatar_key ?? "").icon,
    startedByDisplayName: username,
    startedByUserId: row.user_id,
    startedByUsername: username,
    tags: uniqueTextValues(row.tags).length
      ? uniqueTextValues(row.tags)
      : movieGenres.slice(0, 2),
    title: row.title,
    type: isDiscussionType(row.type) ? row.type : "Question",
  };
}

async function getProfilesForDiscussionRows(rows: CommunityDiscussionRow[]) {
  const userIds = Array.from(new Set(rows.map((row) => row.user_id))).filter(
    Boolean
  );

  if (userIds.length === 0) {
    return new Map<string, ProfileRecord>();
  }

  const profiles = await supabaseFetch<ProfileRecord[]>(
    `/profiles?user_id=in.(${inList(
      userIds
    )})&select=id,user_id,username,avatar_key,favorite_genre,created_at,updated_at`
  ).catch(() => []);

  return new Map(profiles.map((profile) => [profile.user_id, profile]));
}

async function mapDiscussionRows(rows: CommunityDiscussionRow[]) {
  const currentUser = await getCurrentUser().catch(() => null);
  const currentProfile = currentUser
    ? await getCurrentProfile().catch(() => null)
    : null;
  const profilesByUserId = await getProfilesForDiscussionRows(rows);

  return rows.map((row) =>
    mapDiscussionRow({
      currentProfile,
      profilesByUserId,
      row,
    })
  );
}

export function mergeCommunityDiscussions(
  ...discussionLists: CommunityDiscussion[][]
) {
  const discussionsById = new Map<string, CommunityDiscussion>();

  discussionLists.flat().forEach((discussion) => {
    if (!discussionsById.has(discussion.id)) {
      discussionsById.set(discussion.id, discussion);
    }
  });

  return Array.from(discussionsById.values()).sort(
    (firstDiscussion, secondDiscussion) =>
      new Date(secondDiscussion.lastActiveAt).getTime() -
        new Date(firstDiscussion.lastActiveAt).getTime() ||
      new Date(secondDiscussion.createdAt).getTime() -
        new Date(firstDiscussion.createdAt).getTime()
  );
}

export function notifyCommunityDiscussionsUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.setTimeout(() => {
    window.dispatchEvent(new Event(COMMUNITY_DISCUSSIONS_UPDATED_EVENT));
  }, 0);
}

export async function getCommunityDiscussions(limit = 80) {
  const rows = await supabaseFetch<CommunityDiscussionRow[]>(
    `/community_discussions?select=${discussionSelect}&order=last_active_at.desc&limit=${limit}`
  );

  return mapDiscussionRows(rows);
}

export async function getCommunityDiscussion(discussionId: string) {
  const rows = await supabaseFetch<CommunityDiscussionRow[]>(
    `/community_discussions?id=eq.${encodeURIComponent(
      discussionId
    )}&select=${discussionSelect}&limit=1`
  );

  const discussions = await mapDiscussionRows(rows);

  return discussions[0] ?? null;
}

export async function createCommunityDiscussion(
  discussion: CommunityDiscussion
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Create or sign in to your PopFile to start discussions.");
  }

  const rows = await supabaseFetch<CommunityDiscussionRow[]>(
    "/community_discussions",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        body: discussion.body,
        comment_count: discussion.commentCount,
        id: discussion.id,
        is_spoiler: discussion.isSpoiler,
        last_active_at: discussion.lastActiveAt,
        like_count: discussion.likeCount,
        movie_genres: discussion.movieGenres,
        movie_id: discussion.movieId,
        movie_poster_url: discussion.moviePosterUrl,
        movie_title: discussion.movieTitle,
        movie_year: discussion.movieYear,
        tags: discussion.tags,
        title: discussion.title,
        type: discussion.type,
        user_id: currentUser.id,
      }),
    }
  );

  const savedDiscussions = await mapDiscussionRows(rows);
  const savedDiscussion = savedDiscussions[0] ?? {
    ...discussion,
    startedByUserId: currentUser.id,
  };

  notifyCommunityDiscussionsUpdated();

  return savedDiscussion;
}
