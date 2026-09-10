"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import MoviePosterImage from "@/app/components/movie-poster-image";
import ShareMovieActivityButton from "@/app/components/share-movie-activity-button";
import WatchDateEditor from "@/app/components/watch-date-editor";
import {
  getWatchActivityYears,
  getYearlyMovieActivity,
} from "@/lib/movie-watch-stats";
import type { UserMovieRating, UserMovieWatch } from "@/lib/profile-store";
import { posterUrl } from "@/lib/tmdb";
import { movieHref } from "@/lib/urls";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatWatchDate(value: string | null) {
  if (!value) return "Previously watched";

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatHours(minutes: number) {
  if (minutes <= 0) return "—";
  const hours = minutes / 60;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hrs`;
}

function ActivityMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-black/30 p-3 sm:p-4">
      <p className="text-xl font-black text-white sm:text-2xl">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 sm:text-xs">
        {label}
      </p>
    </div>
  );
}

export default function YearlyMovieActivity({
  isOwnProfile,
  ratings,
  username,
  watches,
}: {
  isOwnProfile: boolean;
  ratings: UserMovieRating[];
  username: string;
  watches: UserMovieWatch[];
}) {
  const searchParams = useSearchParams();
  const activityYears = useMemo(() => getWatchActivityYears(watches), [watches]);
  const currentYear = new Date().getFullYear();
  const requestedYear = Number(searchParams.get("activityYear"));
  const [selectedYear, setSelectedYear] = useState(
    activityYears.includes(requestedYear)
      ? requestedYear
      : activityYears.includes(currentYear)
        ? currentYear
        : activityYears[0] ?? currentYear
  );
  const [showAll, setShowAll] = useState(false);
  const visibleYear = activityYears.includes(selectedYear)
    ? selectedYear
    : activityYears[0] ?? currentYear;

  const activity = useMemo(
    () => getYearlyMovieActivity({ ratings, watches, year: visibleYear }),
    [ratings, visibleYear, watches]
  );
  const ratingsByMovie = useMemo(
    () => new Map(ratings.map((rating) => [rating.movieId, rating])),
    [ratings]
  );
  const maxMonthlyCount = Math.max(1, ...activity.monthlyCounts);
  const visibleWatches = showAll ? activity.watches : activity.watches.slice(0, 6);

  return (
    <section id="movie-activity" className="scroll-mt-24 rounded-3xl border border-slate-700/70 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.10),transparent_34%),linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,16,32,0.98))] p-4 shadow-2xl shadow-black/25 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">
            Movie activity
          </p>
          <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
            Your {visibleYear}
          </h2>
        </div>
        <div className="flex items-center justify-end gap-2">
          {activityYears.length > 0 ? (
            <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              <span className="sr-only sm:not-sr-only">Year</span>
              <select
                aria-label="Select movie activity year"
                value={visibleYear}
                onChange={(event) => {
                  setSelectedYear(Number(event.target.value));
                  setShowAll(false);
                }}
                className="min-h-9 rounded-xl border border-yellow-400/35 bg-slate-950 px-2 text-xs font-black normal-case tracking-normal text-yellow-300 outline-none focus:border-yellow-300 sm:ml-2 sm:min-h-10 sm:px-3 sm:text-sm"
              >
                {activityYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          ) : null}
          <ShareMovieActivityButton
            activity={activity}
            isOwnProfile={isOwnProfile}
            username={username}
          />
        </div>
        <p className="col-span-2 text-xs font-medium text-slate-400">
          Every rating can quietly build your year in movies.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <ActivityMetric label="Movies Watched" value={activity.totalWatches} />
        <ActivityMetric label="Unique Movies" value={activity.uniqueMovies} />
        <ActivityMetric label="Rewatches" value={activity.rewatches} />
        <ActivityMetric label="Screen Time" value={formatHours(activity.estimatedMinutes)} />
        <ActivityMetric label="Average PopScore" value={activity.averagePopScore === null ? "—" : `${activity.averagePopScore}%`} />
        <ActivityMetric label="Top Genre" value={activity.topGenre ?? "—"} />
      </div>

      {activity.totalWatches > 0 ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <ActivityMetric
              label="Highest Rated"
              value={activity.highestRatedMovie?.movieTitle ?? "—"}
            />
            <ActivityMetric
              label="Most Rewatched"
              value={
                activity.mostRewatchedMovie
                  ? `${activity.mostRewatchedMovie.title} · ${activity.mostRewatchedMovie.count}×`
                  : "—"
              }
            />
            <ActivityMetric
              label="Biggest Movie Month"
              value={
                activity.biggestMonth
                  ? `${MONTHS[activity.biggestMonth.month - 1]} · ${activity.biggestMonth.count}`
                  : "—"
              }
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-700/60 bg-black/25 p-3 sm:p-4">
            <h3 className="font-black text-white">Monthly watch activity</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {MONTHS.map((month, index) => {
                const count = activity.monthlyCounts[index];
                return (
                  <div key={month} className="grid grid-cols-[72px_minmax(0,1fr)_24px] items-center gap-2 text-xs">
                    <span className="font-bold text-slate-300">{month.slice(0, 3)}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-yellow-400 to-fuchsia-500"
                        style={{ width: `${(count / maxMonthlyCount) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-black text-yellow-300">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-white">Recent Watches</h3>
              {activity.watches.length > 6 ? (
                <button
                  type="button"
                  onClick={() => setShowAll((value) => !value)}
                  className="text-xs font-black text-yellow-300 hover:text-yellow-200"
                >
                  {showAll ? "Show less" : "View all"}
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {visibleWatches.map((watch) => {
                const rating = ratingsByMovie.get(watch.movieId);
                const movieTitle = rating?.movieTitle ?? `Movie ${watch.movieId}`;
                return (
                  <article key={watch.id} className="grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 rounded-2xl border border-slate-700/60 bg-black/30 p-2.5">
                    <Link
                      href={movieHref({ id: watch.movieId, title: movieTitle })}
                      className="relative h-[66px] overflow-hidden rounded-lg bg-slate-900"
                    >
                      <MoviePosterImage
                        alt={`${movieTitle} poster`}
                        className="object-cover"
                        fallbackMovieId={watch.movieId}
                        sizes="44px"
                        src={posterUrl(rating?.posterPath ?? null, "w342")}
                      />
                    </Link>
                    <div className="min-w-0 self-center">
                      <Link href={movieHref({ id: watch.movieId, title: movieTitle })} className="line-clamp-2 text-sm font-black text-white hover:text-yellow-300">
                        {movieTitle}
                      </Link>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {formatWatchDate(watch.watchedDate)}
                      </p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-yellow-300">
                        {watch.watchType === "rewatch"
                          ? "Rewatch"
                          : rating?.popscore
                            ? `Rated ${rating.popscore}%`
                            : "Watched"}
                      </p>
                    </div>
                    {isOwnProfile ? (
                      <WatchDateEditor
                        allowDelete
                        triggerLabel="Edit"
                        watch={watch}
                        className="self-start"
                      />
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-black/25 p-5 text-center">
          <p className="font-black text-white">No watches logged for {visibleYear} yet.</p>
          <p className="mt-2 text-sm font-medium text-slate-400">
            Rate a movie after watching it and PopScore will add it automatically.
          </p>
        </div>
      )}
    </section>
  );
}
