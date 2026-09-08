"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MoviePosterImage from "@/app/components/movie-poster-image";
import ShareMovieDnaButton from "@/app/components/share-movie-dna-button";
import {
  calculateMovieDna,
  type MovieDnaRankingKey,
  type MovieDnaResult,
} from "@/lib/movie-dna";
import { ratingToPercent } from "@/lib/popscore-store";
import type { UserMovieRating } from "@/lib/profile-store";
import { posterUrl } from "@/lib/tmdb";
import { movieHref } from "@/lib/urls";

type MovieDnaSectionProps = {
  ratings: UserMovieRating[];
  username: string;
};

const RANKING_OPTIONS: { key: MovieDnaRankingKey; label: string }[] = [
  { key: "top-rated", label: "Top Rated" },
  { key: "story", label: "Best Storyline" },
  { key: "acting", label: "Best Acting" },
  { key: "rewatch", label: "Most Rewatchable" },
];

function panelClass(className = "") {
  return `rounded-2xl border border-slate-800 bg-black/30 ${className}`;
}

function averageToPercent(value: number) {
  return Math.round(ratingToPercent(value) * 100);
}

function insightGenre(dna: MovieDnaResult) {
  return dna.favoriteGenre ?? dna.mostRatedGenre;
}

function UnlockCard({ count }: { count: number }) {
  const isWaiting = count === 0;
  return (
    <div className={panelClass("p-5 text-center sm:p-7")}>
      <h3 className="text-xl font-black text-white">
        Your Movie DNA is {isWaiting ? "waiting" : "forming"}.
      </h3>
      {isWaiting ? (
        <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-slate-400">
          Rate 5 movies to reveal what genres, qualities, and movie experiences
          matter most to you.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm font-black text-yellow-200">
            {count} of 5 ratings completed
          </p>
          <div
            className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-label="Movie DNA unlock progress"
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={count}
          >
            <div
              className="h-full rounded-full bg-yellow-400 transition-[width] motion-reduce:transition-none"
              style={{ width: `${(count / 5) * 100}%` }}
            />
          </div>
        </>
      )}
      <Link
        href="/rate"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-yellow-400 px-5 text-sm font-black text-black transition hover:bg-yellow-300"
      >
        {isWaiting ? "Rate a Movie" : "Rate Another Movie"}
      </Link>
    </div>
  );
}

function SummaryCard({ dna, username }: { dna: MovieDnaResult; username: string }) {
  const favorite = insightGenre(dna);
  return (
    <div className={panelClass("overflow-hidden border-purple-500/35")}>
      <div className="border-b border-purple-400/20 bg-purple-950/25 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">
              Movie DNA Personality
            </p>
            <h3 className="mt-2 break-words text-3xl font-black text-white sm:text-4xl">
              {dna.personality}
            </h3>
            <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-slate-300">
              {dna.personalityDescription}
            </p>
            <p className="mt-3 text-xs font-black text-yellow-200">
              Based on {dna.eligibleRatings.length} full PopScore ratings
            </p>
          </div>
          <ShareMovieDnaButton dna={dna} username={username} />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-4">
        {[
          ["Ratings Analyzed", `${dna.eligibleRatings.length} Ratings`],
          ["Average PopScore", `${Math.round(dna.averagePopScore)}% Average`],
          [dna.favoriteGenre ? "Favorite Genre" : "Most Rated Genre", favorite?.genre ?? "None yet"],
          ["Strongest Trait", dna.strongestTrait ?? "Still forming"],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 bg-slate-950/95 p-3.5 sm:p-4">
            <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              {label}
            </dt>
            <dd className="mt-1 break-words text-sm font-black text-white sm:text-base">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CoreBreakdown({ dna }: { dna: MovieDnaResult }) {
  const traits = [
    ["Storyline", dna.storyAverage],
    ["Acting", dna.actingAverage],
    ["Rewatch Score", dna.rewatchAverage],
  ] as const;
  return (
    <div className={panelClass("p-5 sm:p-6")}>
      <h3 className="text-lg font-black text-white">What Matters Most to You</h3>
      <div className="mt-5 space-y-4">
        {traits.map(([label, value]) => {
          const percent = averageToPercent(value);
          return (
            <div key={label}>
              <div className="flex items-center justify-between gap-3 text-sm font-black">
                <span className="text-slate-200">{label}</span>
                <span className="text-yellow-300">{percent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-purple-500"
                  style={{ width: `${percent}%` }}
                  role="meter"
                  aria-label={`${label} average`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs font-bold text-slate-500">
        Based on your answers across all fully rated movies.
      </p>
    </div>
  );
}

function GenreDna({ dna }: { dna: MovieDnaResult }) {
  return (
    <div className={panelClass("p-5 sm:p-6")}>
      <h3 className="text-lg font-black text-white">Your Top Genres</h3>
      {dna.topGenres.length ? (
        <div className="mt-4 grid gap-3">
          {dna.topGenres.map((genre) => (
            <article key={genre.genre} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-black text-yellow-200">{genre.genre}</h4>
                <span className="text-xs font-black text-purple-300">{genre.count} movies</span>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {genre.count} movies rated • {Math.round(genre.average)}% average
              </p>
              <p className="mt-2 line-clamp-2 text-xs font-bold text-slate-300">
                Highest rated: {genre.highestRatedMovie.movieTitle} — {Math.round(genre.highestRatedMovie.popscore)}%
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm font-bold leading-6 text-slate-400">
          Rate at least two movies in a genre to reveal your top genres.
        </p>
      )}
    </div>
  );
}

function Rankings({ dna }: { dna: MovieDnaResult }) {
  const [selected, setSelected] = useState<MovieDnaRankingKey>("top-rated");
  const movies = dna.rankings[selected];
  const selectedLabel = RANKING_OPTIONS.find((option) => option.key === selected)!.label;

  return (
    <div className={panelClass("min-w-0 overflow-hidden p-4 sm:p-6")}>
      <h3 className="text-lg font-black text-white">Your Movie Rankings</h3>
      <div
        className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-2"
        role="tablist"
        aria-label="Movie ranking category"
      >
        {RANKING_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={selected === option.key}
            onClick={() => setSelected(option.key)}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-black transition ${
              selected === option.key
                ? "border-yellow-300 bg-yellow-400 text-black"
                : "border-slate-700 bg-slate-950 text-slate-300 hover:border-purple-400 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {movies.map((movie, index) => (
          <li key={movie.id}>
            <Link
              href={movieHref({ id: movie.movieId, title: movie.movieTitle })}
              className="group grid min-h-[92px] grid-cols-[28px_48px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 transition hover:border-purple-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
            >
              <span className="text-center text-lg font-black text-yellow-300">{index + 1}</span>
              <span className="relative aspect-[2/3] w-12 overflow-hidden rounded-lg bg-slate-900">
                <MoviePosterImage
                  src={posterUrl(movie.posterPath ?? null, "w342")}
                  fallbackMovieId={movie.movieId}
                  alt={`${movie.movieTitle} movie poster`}
                  sizes="48px"
                />
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 text-sm font-black text-white group-hover:text-yellow-200">{movie.movieTitle}</span>
                <span className="mt-1 block text-xs font-bold text-slate-500">
                  {movie.releaseDate?.slice(0, 4) || "Year unknown"}
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-black">
                  <span className="text-purple-300">
                    {selected === "top-rated"
                      ? `${Math.round(movie.relevantScore)}% ${selectedLabel}`
                      : `${movie.relevantScore.toFixed(1)}/5 ${selectedLabel}`}
                  </span>
                  <span className="text-yellow-300">{Math.round(movie.popscore)}% PopScore</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MovieDnaSkeleton() {
  return (
    <section aria-label="Loading Movie DNA" className="animate-pulse rounded-3xl border border-slate-800 bg-slate-950/85 p-5 motion-reduce:animate-none sm:p-6">
      <div className="h-6 w-44 rounded bg-slate-800" />
      <div className="mt-3 h-4 w-72 max-w-full rounded bg-slate-800" />
      <div className="mt-6 h-40 rounded-2xl bg-slate-900" />
    </section>
  );
}

export default function MovieDnaSection({ ratings, username }: MovieDnaSectionProps) {
  const dna = useMemo(() => calculateMovieDna(ratings), [ratings]);
  const count = dna.eligibleRatings.length;

  return (
    <section
      id="movie-dna"
      className="w-full min-w-0 scroll-mt-6 overflow-hidden rounded-3xl border border-purple-500/25 bg-slate-950/85 p-4 shadow-xl shadow-purple-950/15 sm:p-6"
      aria-labelledby="movie-dna-heading"
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">Personal taste profile</p>
        <h2 id="movie-dna-heading" className="mt-1 text-2xl font-black text-white sm:text-3xl">Your Movie DNA</h2>
        <p className="mt-1 text-sm font-bold text-slate-400">See what your ratings reveal about your movie taste.</p>
      </div>

      <div className="mt-5">
        {count < 5 ? (
          <UnlockCard count={count} />
        ) : (
          <div className="space-y-4 sm:space-y-5">
            <SummaryCard dna={dna} username={username} />
            <div className="grid gap-4 lg:grid-cols-2">
              <CoreBreakdown dna={dna} />
              <GenreDna dna={dna} />
            </div>
            <Rankings dna={dna} />
          </div>
        )}
      </div>
    </section>
  );
}
