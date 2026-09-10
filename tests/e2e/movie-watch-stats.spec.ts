import { expect, test } from "@playwright/test";
import {
  getWatchActivityYears,
  getYearlyMovieActivity,
} from "@/lib/movie-watch-stats";
import {
  watchTypeForRatingSource,
  type UserMovieRating,
  type UserMovieWatch,
} from "@/lib/profile-store";

function rating({
  genre,
  id,
  movieId,
  popscore,
  title,
}: {
  genre: string;
  id: string;
  movieId: string;
  popscore: number;
  title: string;
}): UserMovieRating {
  return {
    created_at: "2026-01-01T12:00:00Z",
    genre,
    genreNames: [genre],
    id,
    movieId,
    movieTitle: title,
    popscore,
    posterPath: null,
    quick_reaction: null,
    ratingSource: null,
    ratings: { story: 4 },
    releaseDate: null,
    reviewComment: null,
    updated_at: "2026-01-01T12:00:00Z",
    user_id: "user-1",
    weights: [{ key: "story", weight: 1 }],
  };
}

function watch({
  date,
  id,
  movieId,
  runtime,
  type,
}: {
  date: string | null;
  id: string;
  movieId: string;
  runtime: number | null;
  type: UserMovieWatch["watchType"];
}): UserMovieWatch {
  return {
    createdAt: "2026-01-01T12:00:00Z",
    id,
    movieId,
    ratingId: `rating-${movieId}`,
    runtimeMinutes: runtime,
    updatedAt: "2026-01-01T12:00:00Z",
    userId: "user-1",
    watchedDate: date,
    watchType: type,
  };
}

test("yearly activity counts watches, unique movies, rewatches, and runtime separately", () => {
  const ratings = [
    rating({ genre: "Comedy", id: "rating-1", movieId: "1", popscore: 80, title: "Rush Hour" }),
    rating({ genre: "Drama", id: "rating-2", movieId: "2", popscore: 60, title: "Second Movie" }),
  ];
  const watches = [
    watch({ date: "2026-01-05", id: "watch-1", movieId: "1", runtime: 100, type: "first_watch" }),
    watch({ date: "2026-01-12", id: "watch-2", movieId: "1", runtime: 100, type: "rewatch" }),
    watch({ date: "2026-02-02", id: "watch-3", movieId: "2", runtime: 120, type: "first_watch" }),
    watch({ date: "2025-12-30", id: "watch-4", movieId: "2", runtime: 120, type: "first_watch" }),
    watch({ date: null, id: "watch-5", movieId: "1", runtime: 100, type: "historical" }),
  ];

  const activity = getYearlyMovieActivity({ ratings, watches, year: 2026 });

  expect(activity.totalWatches).toBe(3);
  expect(activity.uniqueMovies).toBe(2);
  expect(activity.rewatches).toBe(1);
  expect(activity.estimatedMinutes).toBe(320);
  expect(activity.averagePopScore).toBe(73);
  expect(activity.topGenre).toBe("Comedy");
  expect(activity.mostRewatchedMovie).toMatchObject({ count: 2, title: "Rush Hour" });
  expect(activity.biggestMonth).toEqual({ count: 2, month: 1 });
  expect(activity.monthlyCounts.slice(0, 2)).toEqual([2, 1]);
});

test("activity years omit undated historical watches", () => {
  expect(
    getWatchActivityYears([
      watch({ date: "2024-02-01", id: "1", movieId: "1", runtime: null, type: "first_watch" }),
      watch({ date: "2026-02-01", id: "2", movieId: "2", runtime: null, type: "rewatch" }),
      watch({ date: null, id: "3", movieId: "3", runtime: null, type: "historical" }),
    ])
  ).toEqual([2026, 2024]);
});

test("normal ratings count today while onboarding and imports remain historical", () => {
  expect(watchTypeForRatingSource()).toBe("first_watch");
  expect(watchTypeForRatingSource("movie_match")).toBe("first_watch");
  expect(watchTypeForRatingSource("onboarding")).toBe("historical");
  expect(watchTypeForRatingSource("bulk")).toBe("historical");
  expect(watchTypeForRatingSource("imported")).toBe("imported");
});
