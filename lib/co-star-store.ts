"use client";

export type CoStarReaction = "loved" | "worth" | "trash";

export type CoStarCounts = Record<CoStarReaction, number>;

type CoStarRow = {
  quick_reaction: "loved_it" | "worth_watching" | "trash" | null;
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

export async function getCoStarCounts(movieId: string): Promise<CoStarCounts> {
  const response = await supabaseFetch(
    `/movie_ratings?movie_id=eq.${encodeURIComponent(
      movieId
    )}&select=quick_reaction`
  );
  const rows = (await response.json()) as CoStarRow[];

  return rows.reduce<CoStarCounts>((counts, row) => {
    if (row.quick_reaction === "loved_it") {
      return { ...counts, loved: counts.loved + 1 };
    }

    if (row.quick_reaction === "worth_watching") {
      return { ...counts, worth: counts.worth + 1 };
    }

    if (row.quick_reaction === "trash") {
      return { ...counts, trash: counts.trash + 1 };
    }

    return counts;
  }, { ...emptyCounts });
}
