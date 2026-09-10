import type { UserMovieRating, UserMovieWatch } from "@/lib/profile-store";

export type YearlyMovieActivity = {
  averagePopScore: number | null;
  biggestMonth: { count: number; month: number } | null;
  estimatedMinutes: number;
  highestRatedMovie: UserMovieRating | null;
  monthlyCounts: number[];
  mostRewatchedMovie: { count: number; movieId: string; title: string } | null;
  topGenre: string | null;
  totalWatches: number;
  uniqueMovies: number;
  rewatches: number;
  watches: UserMovieWatch[];
  year: number;
};

function ratingGenres(rating: UserMovieRating | undefined) {
  return rating
    ? Array.from(new Set([...(rating.genreNames ?? []), rating.genre].filter(Boolean)))
    : [];
}

export function getWatchActivityYears(watches: UserMovieWatch[]) {
  return Array.from(
    new Set(
      watches.flatMap((watch) =>
        watch.watchedDate ? [Number(watch.watchedDate.slice(0, 4))] : []
      )
    )
  )
    .filter(Number.isFinite)
    .sort((a, b) => b - a);
}

export function getYearlyMovieActivity({
  ratings,
  watches,
  year,
}: {
  ratings: UserMovieRating[];
  watches: UserMovieWatch[];
  year: number;
}): YearlyMovieActivity {
  const yearPrefix = `${year}-`;
  const yearWatches = watches
    .filter((watch) => watch.watchedDate?.startsWith(yearPrefix))
    .sort((a, b) =>
      `${b.watchedDate ?? ""}-${b.createdAt}`.localeCompare(
        `${a.watchedDate ?? ""}-${a.createdAt}`
      )
    );
  const ratingsByMovie = new Map(ratings.map((rating) => [rating.movieId, rating]));
  const monthlyCounts = Array.from({ length: 12 }, () => 0);
  const movieCounts = new Map<string, number>();
  const genreCounts = new Map<string, number>();
  let estimatedMinutes = 0;
  let scoreTotal = 0;
  let scoredWatches = 0;

  yearWatches.forEach((watch) => {
    const month = Number(watch.watchedDate?.slice(5, 7));

    if (month >= 1 && month <= 12) monthlyCounts[month - 1] += 1;
    movieCounts.set(watch.movieId, (movieCounts.get(watch.movieId) ?? 0) + 1);
    if (watch.runtimeMinutes) estimatedMinutes += watch.runtimeMinutes;

    const rating = ratingsByMovie.get(watch.movieId);
    if (rating && rating.popscore > 0) {
      scoreTotal += rating.popscore;
      scoredWatches += 1;
    }

    ratingGenres(rating).forEach((genre) => {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    });
  });

  const watchedRatings = Array.from(movieCounts.keys())
    .flatMap((movieId) => {
      const rating = ratingsByMovie.get(movieId);
      return rating ? [rating] : [];
    })
    .sort((a, b) => b.popscore - a.popscore || a.movieTitle.localeCompare(b.movieTitle));
  const mostRewatchedEntry = Array.from(movieCounts.entries())
    .filter(([, count]) => count > 1)
    .sort(([movieA, countA], [movieB, countB]) =>
      countB - countA ||
      (ratingsByMovie.get(movieA)?.movieTitle ?? movieA).localeCompare(
        ratingsByMovie.get(movieB)?.movieTitle ?? movieB
      )
    )[0];
  const biggestMonthCount = Math.max(0, ...monthlyCounts);
  const biggestMonthIndex = monthlyCounts.indexOf(biggestMonthCount);
  const topGenre = Array.from(genreCounts.entries()).sort(
    ([genreA, countA], [genreB, countB]) =>
      countB - countA || genreA.localeCompare(genreB)
  )[0]?.[0] ?? null;

  return {
    averagePopScore:
      scoredWatches > 0 ? Math.round(scoreTotal / scoredWatches) : null,
    biggestMonth:
      biggestMonthCount > 0
        ? { count: biggestMonthCount, month: biggestMonthIndex + 1 }
        : null,
    estimatedMinutes,
    highestRatedMovie: watchedRatings[0] ?? null,
    monthlyCounts,
    mostRewatchedMovie: mostRewatchedEntry
      ? {
          count: mostRewatchedEntry[1],
          movieId: mostRewatchedEntry[0],
          title:
            ratingsByMovie.get(mostRewatchedEntry[0])?.movieTitle ??
            `Movie ${mostRewatchedEntry[0]}`,
        }
      : null,
    rewatches: yearWatches.filter((watch) => watch.watchType === "rewatch").length,
    topGenre,
    totalWatches: yearWatches.length,
    uniqueMovies: movieCounts.size,
    watches: yearWatches,
    year,
  };
}
