import "server-only";

import { unstable_cache } from "next/cache";
import { avatarForKey, genreLabelForKey } from "@/lib/profile-config";
import type {
  CommunityRatingFeedItem,
  DiscoverableUserSummary,
  ProfileQuickReaction,
  TopReviewerSummary,
  UserMovieRatingSource,
} from "@/lib/profile-store";

const COMMUNITY_CACHE_SECONDS = 60;
const PAGE_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 8000;

type CommunityProfileRow = {
  avatar_key: string;
  favorite_genre: string | null;
  user_id: string;
  username: string;
};

type CommunityRatingRow = {
  created_at: string;
  genre: string;
  genre_names: string[] | null;
  id: string;
  movie_id: string;
  movie_title: string;
  popscore: number;
  poster_path: string | null;
  quick_reaction: ProfileQuickReaction | null;
  rating_source?: UserMovieRatingSource | null;
  ratings: Record<string, number> | null;
  release_date: string | null;
  review_comment: string | null;
  updated_at: string;
  user_id: string;
  weights: { key: string; weight: number }[] | null;
};

type FollowRow = {
  following_id: string;
};

export type CommunityOverview = {
  ratings: CommunityRatingFeedItem[];
  reviewers: TopReviewerSummary[];
  users: DiscoverableUserSummary[];
};

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase is not configured.");
  }

  return {
    key,
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`,
  };
}

async function supabaseGet<T>(path: string): Promise<T> {
  const config = supabaseConfig();
  const response = await fetch(`${config.restUrl}${path}`, {
    cache: "no-store",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Supabase community request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function fetchAllPages<T>(path: string) {
  const rows: T[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const separator = path.includes("?") ? "&" : "?";
    const page = await supabaseGet<T[]>(
      `${path}${separator}limit=${PAGE_SIZE}&offset=${offset}`
    );
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}

function hasCompleteRating(row: CommunityRatingRow) {
  return Boolean(
    row.weights?.length && row.ratings && Object.keys(row.ratings).length > 0
  );
}

function toFeedRating(
  row: CommunityRatingRow,
  profile: CommunityProfileRow | undefined
): CommunityRatingFeedItem {
  return {
    avatar: avatarForKey(profile?.avatar_key ?? "").icon,
    created_at: row.created_at,
    genre: row.genre,
    genreNames: row.genre_names ?? [],
    id: row.id,
    movieId: row.movie_id,
    movieTitle: row.movie_title,
    popscore: Number(row.popscore),
    posterPath: row.poster_path,
    quick_reaction: row.quick_reaction,
    ratingSource: row.rating_source ?? null,
    ratings: row.ratings ?? {},
    releaseDate: row.release_date,
    reviewComment: row.review_comment,
    updated_at: row.updated_at,
    user_id: row.user_id,
    username: profile?.username ?? `user_${row.user_id.slice(0, 8)}`,
    weights: row.weights ?? [],
  };
}

async function loadCommunityOverview(): Promise<CommunityOverview> {
  const startedAt = Date.now();

  try {
    const [profiles, ratingRows, follows] = await Promise.all([
      fetchAllPages<CommunityProfileRow>(
        "/profiles?select=user_id,username,avatar_key,favorite_genre&order=username.asc"
      ),
      fetchAllPages<CommunityRatingRow>(
        "/movie_ratings?select=id,user_id,movie_id,movie_title,poster_path,release_date,genre,genre_names,ratings,weights,popscore,quick_reaction,rating_source,review_comment,created_at,updated_at&order=updated_at.desc"
      ),
      fetchAllPages<FollowRow>(
        "/user_follows?select=following_id&order=created_at.desc"
      ),
    ]);
    const profilesByUserId = new Map(
      profiles.map((profile) => [profile.user_id, profile])
    );
    const ratingCountsByUserId = new Map<string, Set<string>>();

    ratingRows.forEach((row) => {
      if (!hasCompleteRating(row)) {
        return;
      }

      const movieIds = ratingCountsByUserId.get(row.user_id) ?? new Set<string>();
      movieIds.add(row.movie_id);
      ratingCountsByUserId.set(row.user_id, movieIds);
    });

    const followersByUserId = follows.reduce((totals, follow) => {
      totals.set(
        follow.following_id,
        (totals.get(follow.following_id) ?? 0) + 1
      );
      return totals;
    }, new Map<string, number>());
    const ratings = ratingRows
      .filter(
        (row) => hasCompleteRating(row) && Boolean(row.review_comment?.trim())
      )
      .slice(0, 30)
      .map((row) => toFeedRating(row, profilesByUserId.get(row.user_id)));
    const reviewers = Array.from(ratingCountsByUserId, ([userId, movieIds]) => {
      const profile = profilesByUserId.get(userId);

      return {
        avatar: avatarForKey(profile?.avatar_key ?? "").icon,
        totalReviews: movieIds.size,
        userId,
        username: profile?.username ?? `user_${userId.slice(0, 8)}`,
      } satisfies TopReviewerSummary;
    })
      .sort(
        (first, second) =>
          second.totalReviews - first.totalReviews ||
          first.username.localeCompare(second.username)
      )
      .slice(0, 150);
    const users = profiles
      .map((profile) => ({
        avatar: avatarForKey(profile.avatar_key).icon,
        displayName: profile.username,
        favoriteGenre: profile.favorite_genre
          ? genreLabelForKey(profile.favorite_genre)
          : "Not set",
        followersCount: followersByUserId.get(profile.user_id) ?? 0,
        totalReviews: ratingCountsByUserId.get(profile.user_id)?.size ?? 0,
        userId: profile.user_id,
        username: profile.username,
      }))
      .sort(
        (first, second) =>
          second.totalReviews - first.totalReviews ||
          first.username.localeCompare(second.username)
      )
      .slice(0, 80);

    console.log(
      JSON.stringify({
        level: "info",
        message: "Community overview loaded",
        duration_ms: Date.now() - startedAt,
        profiles: profiles.length,
        ratings: ratingRows.length,
        follows: follows.length,
      })
    );

    return { ratings, reviewers, users };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Community overview failed",
        duration_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      })
    );
    throw error;
  }
}

const getCachedCommunityOverview = unstable_cache(
  loadCommunityOverview,
  ["community-overview-v1"],
  {
    revalidate: COMMUNITY_CACHE_SECONDS,
    tags: ["community-overview"],
  }
);

export async function getCommunityOverview(): Promise<CommunityOverview> {
  return getCachedCommunityOverview();
}
