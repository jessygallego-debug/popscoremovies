import {
  discussionTypes,
  isPlaceholderCommunityDiscussionId,
  type CommunityDiscussion,
  type DiscussionType,
} from "@/lib/community-discussions";
import { avatarForKey } from "@/lib/profile-config";

type PublicCommunityDiscussionRow = {
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

type PublicDiscussionProfileRow = {
  avatar_key: string | null;
  user_id: string;
  username: string;
};

const discussionSelect =
  "id,user_id,movie_id,movie_title,movie_year,movie_poster_url,movie_genres,title,body,type,tags,is_spoiler,comment_count,like_count,created_at,last_active_at";
const publicDiscussionRevalidateSeconds = 300;

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

async function supabaseFetch<T>(path: string): Promise<T> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.restUrl}${path}`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: publicDiscussionRevalidateSeconds },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

function inList(values: string[]) {
  return values.map((value) => encodeURIComponent(value)).join(",");
}

function isDiscussionType(value: string): value is DiscussionType {
  return discussionTypes.includes(value as DiscussionType);
}

function uniqueTextValues(values: string[] | null | undefined) {
  return Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter(Boolean))
  );
}

function profileFallbackUsername(userId: string) {
  return `user_${userId.slice(0, 8)}`;
}

async function getProfilesForDiscussionRows(
  rows: PublicCommunityDiscussionRow[]
) {
  const userIds = Array.from(new Set(rows.map((row) => row.user_id))).filter(
    Boolean
  );

  if (userIds.length === 0) {
    return new Map<string, PublicDiscussionProfileRow>();
  }

  try {
    const profiles = await supabaseFetch<PublicDiscussionProfileRow[]>(
      `/profiles?user_id=in.(${inList(
        userIds
      )})&select=user_id,username,avatar_key`
    );

    return new Map(profiles.map((profile) => [profile.user_id, profile]));
  } catch {
    return new Map<string, PublicDiscussionProfileRow>();
  }
}

function mapDiscussionRow({
  profilesByUserId,
  row,
}: {
  profilesByUserId: Map<string, PublicDiscussionProfileRow>;
  row: PublicCommunityDiscussionRow;
}): CommunityDiscussion {
  const profile = profilesByUserId.get(row.user_id);
  const username = profile?.username ?? profileFallbackUsername(row.user_id);
  const movieGenres = uniqueTextValues(row.movie_genres);
  const tags = uniqueTextValues(row.tags);

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
    tags: tags.length ? tags : movieGenres.slice(0, 2),
    title: row.title,
    type: isDiscussionType(row.type) ? row.type : "Question",
  };
}

async function mapDiscussionRows(rows: PublicCommunityDiscussionRow[]) {
  const realRows = rows.filter(
    (row) => !isPlaceholderCommunityDiscussionId(row.id)
  );
  const profilesByUserId = await getProfilesForDiscussionRows(realRows);

  return realRows.map((row) =>
    mapDiscussionRow({
      profilesByUserId,
      row,
    })
  );
}

export async function getPublicCommunityDiscussions(limit = 80) {
  try {
    const rows = await supabaseFetch<PublicCommunityDiscussionRow[]>(
      `/community_discussions?select=${discussionSelect}&order=last_active_at.desc&limit=${limit}`
    );

    return mapDiscussionRows(rows);
  } catch {
    return [];
  }
}

export async function getPublicCommunityDiscussion(discussionId: string) {
  if (isPlaceholderCommunityDiscussionId(discussionId)) {
    return null;
  }

  try {
    const rows = await supabaseFetch<PublicCommunityDiscussionRow[]>(
      `/community_discussions?id=eq.${encodeURIComponent(
        discussionId
      )}&select=${discussionSelect}&limit=1`
    );
    const discussions = await mapDiscussionRows(rows);

    return discussions[0] ?? null;
  } catch {
    return null;
  }
}

export async function getPublicCommunityDiscussionsForMovie(
  movieId: string,
  limit = 3
) {
  try {
    const rows = await supabaseFetch<PublicCommunityDiscussionRow[]>(
      `/community_discussions?movie_id=eq.${encodeURIComponent(
        movieId
      )}&select=${discussionSelect}&order=last_active_at.desc&limit=${limit}`
    );

    return mapDiscussionRows(rows);
  } catch {
    return [];
  }
}
