import "server-only";
import { unstable_cache } from "next/cache";

type SiteStatsRow = {
  id?: string | null;
  movie_id?: string | null;
  ratings?: Record<string, unknown> | null;
  user_id?: string | null;
  weights?: unknown[] | null;
};

type SiteEngagementTotals = {
  totalMoviesRated: number;
  totalRatings: number;
};

const EMPTY_SITE_ENGAGEMENT_TOTALS: SiteEngagementTotals = {
  totalMoviesRated: 0,
  totalRatings: 0,
};
const SITE_STATS_TIMEOUT_MS = 2500;

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

async function supabaseFetch<T>(path: string, signal?: AbortSignal) {
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
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function fetchAllRows(
  tableName: string,
  select: string,
  signal?: AbortSignal
) {
  const rows: SiteStatsRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await supabaseFetch<SiteStatsRow[]>(
      `/${tableName}?select=${select}&order=id&limit=1000&offset=${offset}`,
      signal
    );
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

function hasCompletedRating(row: SiteStatsRow) {
  return Boolean(
    row.weights?.length &&
      row.ratings &&
      Object.keys(row.ratings).length > 0
  );
}

function uniqueInteractionKey(row: SiteStatsRow, fallbackKey: string) {
  if (row.user_id && row.movie_id) {
    return `${row.user_id}:${row.movie_id}`;
  }

  return fallbackKey;
}

async function loadSiteEngagementTotals(
  signal?: AbortSignal
): Promise<SiteEngagementTotals> {
  const [profileRatings, legacyRatings] = await Promise.all([
    fetchAllRows(
      "movie_ratings",
      "id,user_id,movie_id,ratings,weights",
      signal
    ),
    fetchAllRows(
      "ratings",
      "id,movie_id,ratings,weights",
      signal
    ),
  ]);
  const ratingKeys = new Set<string>();
  const ratedMovieIds = new Set<string>();

  [...profileRatings, ...legacyRatings].forEach((row, index) => {
    if (!hasCompletedRating(row)) {
      return;
    }

    ratingKeys.add(uniqueInteractionKey(row, `rating:${row.id ?? index}`));

    if (row.movie_id) {
      ratedMovieIds.add(row.movie_id);
    }
  });

  return {
    totalMoviesRated: ratedMovieIds.size,
    totalRatings: ratingKeys.size,
  };
}

async function loadTimedSiteEngagementTotals(): Promise<SiteEngagementTotals> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, SITE_STATS_TIMEOUT_MS);

  try {
    return await loadSiteEngagementTotals(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Cache only complete, successful totals. Failed refreshes must not replace good data.
const getCachedSiteEngagementTotals = unstable_cache(
  loadTimedSiteEngagementTotals,
  ["site-engagement-totals-v2"],
  { revalidate: 60, tags: ["site-engagement-totals"] }
);

export async function getSiteEngagementTotals(): Promise<SiteEngagementTotals> {
  try {
    return await getCachedSiteEngagementTotals();
  } catch (error) {
    console.error("Site engagement totals failed", error instanceof Error ? error.message : String(error));
    return EMPTY_SITE_ENGAGEMENT_TOTALS;
  }
}
