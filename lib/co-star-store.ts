"use client";

import { getSupabaseAccessToken } from "@/lib/profile-store";

export type CoStarReaction = "loved" | "worth" | "trash";

export type CoStarCounts = Record<CoStarReaction, number>;

type CoStarRow = {
  reaction: CoStarReaction;
};

const emptyCounts: CoStarCounts = {
  loved: 0,
  trash: 0,
  worth: 0,
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

async function supabaseFetch(
  path: string,
  options: RequestInit = {},
  accessToken?: string
) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.restUrl}${path}`, {
    ...options,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken ?? config.key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}.`);
  }

  return response;
}

export async function saveCoStarReaction(
  movieId: string,
  reaction: CoStarReaction,
  userId: string
) {
  const accessToken = await getSupabaseAccessToken();

  if (!accessToken) {
    throw new Error("Please sign in before reacting.");
  }

  await supabaseFetch(
    "/co_star_reactions?on_conflict=user_id,movie_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        movie_id: movieId,
        reaction,
        user_id: userId,
      }),
    },
    accessToken
  );
}

export async function getCoStarCounts(movieId: string): Promise<CoStarCounts> {
  const response = await supabaseFetch(
    `/co_star_reactions?movie_id=eq.${encodeURIComponent(
      movieId
    )}&select=reaction`
  );
  const rows = (await response.json()) as CoStarRow[];

  return rows.reduce<CoStarCounts>(
    (counts, row) => ({
      ...counts,
      [row.reaction]: counts[row.reaction] + 1,
    }),
    { ...emptyCounts }
  );
}
