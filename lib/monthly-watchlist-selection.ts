import type { MonthlyWatchlistMovie } from "./monthly-watchlist-email";

export const MONTHLY_SECTION_SIZE = 4;

export function monthlyPopularityScore(popularity?: number) {
  return Number.isFinite(popularity) ? Math.max(popularity!, 0) : 0;
}

export function selectMonthlyPicks(movies: MonthlyWatchlistMovie[]) {
  const ranked = [...movies].sort((a, b) =>
    b.rankingScore - a.rankingScore || a.movieId.localeCompare(b.movieId)
  );
  const result: MonthlyWatchlistMovie[] = [];
  for (const category of ["digital", "subscription_streaming"] as const) {
    const seen = new Set<string>();
    const candidates = ranked.filter((movie) => {
      if (movie.category !== category || seen.has(movie.movieId)) return false;
      seen.add(movie.movieId);
      return true;
    });
    const selected: MonthlyWatchlistMovie[] = [];
    const providerCounts = new Map<string, number>();
    for (const movie of candidates) {
      const provider = movie.provider?.trim().toLowerCase() ?? "";
      if (category === "subscription_streaming" && (providerCounts.get(provider) ?? 0) >= 2) continue;
      selected.push(movie);
      providerCounts.set(provider, (providerCounts.get(provider) ?? 0) + 1);
      if (selected.length === MONTHLY_SECTION_SIZE) break;
    }
    // Keep all four slots when there are too few alternatives to satisfy the cap.
    for (const movie of candidates) {
      if (selected.length === MONTHLY_SECTION_SIZE) break;
      if (!selected.includes(movie)) selected.push(movie);
    }
    selected.sort((a, b) => b.rankingScore - a.rankingScore);
    result.push(...selected.map((movie, index) => ({ ...movie, displayOrder: index + 1 })));
  }
  return result;
}

export function assertCompleteMonthlyPicks(movies: MonthlyWatchlistMovie[]) {
  for (const category of ["digital", "subscription_streaming"] as const) {
    const count = new Set(movies.filter((movie) => movie.category === category).map((movie) => movie.movieId)).size;
    if (count !== MONTHLY_SECTION_SIZE) {
      throw new Error(`Monthly Watchlist needs four verified ${category === "digital" ? "digital" : "streaming"} movies; found ${count}. Update the release feed before finalizing or sending.`);
    }
  }
}
