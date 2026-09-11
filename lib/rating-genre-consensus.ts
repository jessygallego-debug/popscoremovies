import "server-only";

import {
  isRatingGenreKey,
  type RatingGenreDecision,
} from "@/lib/rating-genre-resolver";

type ConsensusRow = {
  genre: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  return {
    key,
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`,
  };
}

export async function getMovieRatingGenreConsensus(
  movieId: string
): Promise<RatingGenreDecision["genre"] | null> {
  const config = getSupabaseConfig();

  if (!config || !/^\d+$/.test(movieId)) return null;

  const response = await fetch(
    `${config.restUrl}/movie_rating_genre_consensus?movie_id=eq.${encodeURIComponent(
      movieId
    )}&select=genre&limit=1`,
    {
      cache: "no-store",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
    }
  ).catch(() => null);

  if (!response?.ok) return null;

  const rows = (await response.json()) as ConsensusRow[];
  const genre = rows[0]?.genre;

  return genre && isRatingGenreKey(genre) ? genre : null;
}
