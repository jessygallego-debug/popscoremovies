import { avatarForKey } from "@/lib/profile-config";
import { containsProfanity, normalizeReviewComment } from "@/lib/review-comments";

type MovieRatingReviewRow = {
  id: string;
  user_id: string;
  popscore: number | string;
  ratings: Record<string, number> | null;
  review_comment: string | null;
  weights: { key: string; weight: number }[] | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  user_id: string;
  username: string;
  avatar_key: string;
};

export type FanReview = {
  avatar: string;
  createdAt: string;
  id: string;
  popscore: number;
  ratingLabel: string;
  reviewComment: string;
  username: string;
};

export type MovieAggregateRating = {
  count: number;
  score: number;
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

async function supabaseFetch<T>(path: string): Promise<T> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.restUrl}${path}`, {
    cache: "no-store",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

function getRatingLabel(score: number) {
  if (score >= 90) {
    return "Extra Buttery";
  }

  if (score >= 75) {
    return "Buttery";
  }

  if (score >= 60) {
    return "Fresh Popcorn";
  }

  if (score >= 40) {
    return "Salty";
  }

  return "Burnt";
}

function clampScore(score: number) {
  return Math.min(Math.max(Math.round(score), 0), 100);
}

export async function getMovieAggregateRatingForSeo(
  movieId: string
): Promise<MovieAggregateRating | null> {
  try {
    const rows = await supabaseFetch<MovieRatingReviewRow[]>(
      `/movie_ratings?movie_id=eq.${encodeURIComponent(
        movieId
      )}&select=popscore,ratings,weights`
    );
    const completedRows = rows.filter(
      (row) =>
        row.weights?.length &&
        row.ratings &&
        Object.keys(row.ratings).length > 0
    );

    if (completedRows.length === 0) {
      return null;
    }

    const totalScore = completedRows.reduce(
      (total, row) => total + clampScore(Number(row.popscore)),
      0
    );

    return {
      count: completedRows.length,
      score: clampScore(totalScore / completedRows.length),
    };
  } catch {
    return null;
  }
}

export async function getMovieFanReviews(movieId: string): Promise<FanReview[]> {
  try {
    const rows = await supabaseFetch<MovieRatingReviewRow[]>(
      `/movie_ratings?movie_id=eq.${encodeURIComponent(
        movieId
      )}&select=id,user_id,popscore,ratings,weights,review_comment,created_at,updated_at&order=updated_at.desc&limit=12`
    );
    const cleanRows = rows
      .map((row) => ({
        ...row,
        review_comment: normalizeReviewComment(row.review_comment ?? ""),
      }))
      .filter(
        (row) =>
          row.weights?.length &&
          row.ratings &&
          Object.keys(row.ratings).length > 0 &&
          row.review_comment &&
          !containsProfanity(row.review_comment)
      );

    if (cleanRows.length === 0) {
      return [];
    }

    const userIds = Array.from(new Set(cleanRows.map((row) => row.user_id)));
    const profiles = await supabaseFetch<ProfileRow[]>(
      `/profiles?user_id=in.(${userIds
        .map((userId) => encodeURIComponent(userId))
        .join(",")})&select=user_id,username,avatar_key`
    ).catch(() => []);
    const profileByUserId = new Map(
      profiles.map((profile) => [profile.user_id, profile])
    );

    return cleanRows.map((row) => {
      const profile = profileByUserId.get(row.user_id);
      const score = clampScore(Number(row.popscore));
      const avatar = profile ? avatarForKey(profile.avatar_key).icon : "🍿";

      return {
        avatar,
        createdAt: row.updated_at ?? row.created_at,
        id: row.id,
        popscore: score,
        ratingLabel: getRatingLabel(score),
        reviewComment: row.review_comment,
        username: profile?.username ?? "PopScore Fan",
      };
    });
  } catch {
    return [];
  }
}
