"use client";

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

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.restUrl}${path}`, {
    ...options,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
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
  reaction: CoStarReaction
) {
  await supabaseFetch("/co_star_reactions", {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      movie_id: movieId,
      reaction,
    }),
  });
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
