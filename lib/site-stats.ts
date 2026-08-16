type SiteStatsRow = {
  id?: string | null;
  movie_id?: string | null;
  quick_reaction?: string | null;
  ratings?: Record<string, unknown> | null;
  reaction?: string | null;
  user_id?: string | null;
  weights?: unknown[] | null;
};

type SiteEngagementTotals = {
  totalRatings: number;
  totalReactions: number;
};

const EMPTY_SITE_ENGAGEMENT_TOTALS: SiteEngagementTotals = {
  totalRatings: 0,
  totalReactions: 0,
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
    next: { revalidate: 60 },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function fetchAllRows(
  tableName: string,
  selectOptions: string[],
  signal?: AbortSignal
) {
  const pageSize = 1000;

  for (const select of selectOptions) {
    const rows: SiteStatsRow[] = [];
    let offset = 0;

    try {
      for (;;) {
        const page = await supabaseFetch<SiteStatsRow[]>(
          `/${tableName}?select=${select}&limit=${pageSize}&offset=${offset}`,
          signal
        );

        rows.push(...page);

        if (page.length < pageSize) {
          return rows;
        }

        offset += pageSize;
      }
    } catch {
      rows.length = 0;
    }
  }

  return [];
}

function hasCompletedRating(row: SiteStatsRow) {
  return Boolean(
    row.weights?.length &&
      row.ratings &&
      Object.keys(row.ratings).length > 0
  );
}

function hasReaction(row: SiteStatsRow) {
  const reaction = row.quick_reaction ?? row.reaction;

  return (
    reaction === "loved" ||
    reaction === "loved_it" ||
    reaction === "worth" ||
    reaction === "worth_watching" ||
    reaction === "trash"
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
  const [profileRatings, legacyRatings, legacyReactions] = await Promise.all([
    fetchAllRows(
      "movie_ratings",
      ["id,user_id,movie_id,ratings,weights,quick_reaction"],
      signal
    ),
    fetchAllRows(
      "ratings",
      [
        "id,user_id,movie_id,ratings,weights",
        "id,movie_id,ratings,weights",
      ],
      signal
    ),
    fetchAllRows(
      "co_star_reactions",
      [
        "id,user_id,movie_id,quick_reaction,reaction",
        "id,movie_id,quick_reaction,reaction",
      ],
      signal
    ),
  ]);
  const ratingKeys = new Set<string>();
  const reactionKeys = new Set<string>();

  [...profileRatings, ...legacyRatings].forEach((row, index) => {
    if (!hasCompletedRating(row)) {
      return;
    }

    ratingKeys.add(uniqueInteractionKey(row, `rating:${row.id ?? index}`));
  });

  profileRatings.forEach((row, index) => {
    if (!hasReaction(row)) {
      return;
    }

    reactionKeys.add(
      uniqueInteractionKey(row, `profile-reaction:${row.id ?? index}`)
    );
  });

  legacyReactions.forEach((row, index) => {
    if (!hasReaction(row)) {
      return;
    }

    reactionKeys.add(
      uniqueInteractionKey(row, `legacy-reaction:${row.id ?? index}`)
    );
  });

  return {
    totalRatings: ratingKeys.size,
    totalReactions: reactionKeys.size,
  };
}

export async function getSiteEngagementTotals(): Promise<SiteEngagementTotals> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, SITE_STATS_TIMEOUT_MS);

  try {
    return await loadSiteEngagementTotals(controller.signal);
  } catch {
    return EMPTY_SITE_ENGAGEMENT_TOTALS;
  } finally {
    clearTimeout(timeoutId);
  }
}
