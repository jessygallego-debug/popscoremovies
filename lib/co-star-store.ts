"use client";

export type CoStarReaction = "loved" | "worth" | "trash";

export type CoStarCounts = Record<CoStarReaction, number>;

type CoStarRow = {
  quick_reaction: "loved_it" | "worth_watching" | "trash" | null;
};

type LegacyCoStarRow = {
  quick_reaction?: "loved_it" | "worth_watching" | "trash" | null;
  reaction?: "loved" | "worth" | "trash" | "loved_it" | "worth_watching" | null;
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
  const [profileRows, legacyRows] = await Promise.all([
    getProfileReactionRows(movieId),
    getLegacyReactionRows(movieId),
  ]);
  const profileCounts = countProfileRows(profileRows);
  const legacyCounts = countLegacyRows(legacyRows);

  return {
    loved: Math.max(profileCounts.loved, legacyCounts.loved),
    trash: Math.max(profileCounts.trash, legacyCounts.trash),
    worth: Math.max(profileCounts.worth, legacyCounts.worth),
  };
}

async function getProfileReactionRows(movieId: string) {
  try {
    const response = await supabaseFetch(
      `/movie_ratings?movie_id=eq.${encodeURIComponent(
        movieId
      )}&select=quick_reaction`
    );

    return (await response.json()) as CoStarRow[];
  } catch {
    return [];
  }
}

async function getLegacyReactionRows(movieId: string) {
  try {
    const response = await supabaseFetch(
      `/co_star_reactions?movie_id=eq.${encodeURIComponent(movieId)}&select=*`
    );

    return (await response.json()) as LegacyCoStarRow[];
  } catch {
    return [];
  }
}

function countProfileRows(rows: CoStarRow[]) {
  return rows.reduce<CoStarCounts>((counts, row) => {
    return addReactionToCounts(counts, row.quick_reaction);
  }, { ...emptyCounts });
}

function countLegacyRows(rows: LegacyCoStarRow[]) {
  return rows.reduce<CoStarCounts>((counts, row) => {
    return addReactionToCounts(
      counts,
      row.quick_reaction ?? row.reaction ?? null
    );
  }, { ...emptyCounts });
}

function addReactionToCounts(
  counts: CoStarCounts,
  reaction: LegacyCoStarRow["reaction"] | CoStarRow["quick_reaction"] | null
) {
  if (reaction === "loved" || reaction === "loved_it") {
    return { ...counts, loved: counts.loved + 1 };
  }

  if (reaction === "worth" || reaction === "worth_watching") {
    return { ...counts, worth: counts.worth + 1 };
  }

  if (reaction === "trash") {
    return { ...counts, trash: counts.trash + 1 };
  }

  return counts;
}
