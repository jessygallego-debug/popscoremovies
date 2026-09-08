"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MoviePosterImage from "@/app/components/movie-poster-image";
import ShareMovieDnaButton from "@/app/components/share-movie-dna-button";
import {
  calculateMovieDna,
  getMovieDnaGenreFilters,
  getMovieDnaGenreQuestionAverages,
  getMovieDnaRanking,
  getMovieDnaRatingsForGenre,
  type MovieDnaGenreStat,
  type MovieDnaRankingKey,
  type MovieDnaRating,
  type MovieDnaResult,
} from "@/lib/movie-dna";
import type { GenreKey } from "@/lib/genre-rating-config";
import { ratingToPercent } from "@/lib/popscore-store";
import type { UserMovieRating } from "@/lib/profile-store";
import { posterUrl } from "@/lib/tmdb";
import { movieHref } from "@/lib/urls";

type MovieDnaSectionProps = {
  percentile: number;
  ratings: UserMovieRating[];
  totalMoviesRated: number;
  username: string;
};

const RANKING_OPTIONS: {
  description: string;
  key: MovieDnaRankingKey;
  label: string;
  scoreLabel: string;
}[] = [
  {
    description: "Your highest overall PopScores.",
    key: "top-rated",
    label: "Top Rated",
    scoreLabel: "PopScore",
  },
  {
    description:
      "Movies where Storyline scored especially high compared with your other answers.",
    key: "story",
    label: "Story Standouts",
    scoreLabel: "Storyline",
  },
  {
    description:
      "Movies where Acting scored especially high compared with your other answers.",
    key: "acting",
    label: "Acting Standouts",
    scoreLabel: "Acting",
  },
  {
    description:
      "Movies where Rewatch Score stood out compared with your other answers.",
    key: "rewatch",
    label: "Rewatch Favorites",
    scoreLabel: "Rewatch Score",
  },
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

function getLoveTags(dna: MovieDnaResult) {
  const traits = [
    { label: "Strong Stories", value: dna.storyAverage },
    { label: "Great Performances", value: dna.actingAverage },
    { label: "High Rewatch Value", value: dna.rewatchAverage },
  ].sort((first, second) => second.value - first.value);
  const favorite = insightGenre(dna);
  return [
    ...traits.slice(0, 2).map((trait) => trait.label),
    ...(favorite ? [`${favorite.genre} Movies`] : []),
    ...(dna.averagePopScore >= 85 ? ["Standout Favorites"] : []),
  ];
}

function SummaryCard({
  dna,
  percentile,
  totalMoviesRated,
  username,
}: {
  dna: MovieDnaResult;
  percentile: number;
  totalMoviesRated: number;
  username: string;
}) {
  const favorite = insightGenre(dna);
  const loveTags = getLoveTags(dna);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl bg-gradient-to-br from-yellow-400/20 to-amber-950/20 p-5 ring-1 ring-yellow-400/30">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">#1 Genre</p>
          <p className="mt-2 text-3xl font-black text-white">{favorite?.genre ?? "Still forming"}</p>
          <p className="mt-2 text-xs font-bold text-slate-400">
            {favorite ? `${favorite.count} fully rated movies` : "Keep rating to reveal your favorite"}
          </p>
        </article>
        <article className="rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-950/20 p-5 ring-1 ring-purple-400/30">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-300">Average PopScore</p>
          <p className="mt-2 text-4xl font-black text-white">{Math.round(dna.averagePopScore)}%</p>
          <p className="mt-1 text-xs font-bold text-slate-400">Across {dna.eligibleRatings.length} full ratings</p>
        </article>
      </div>

      <article className="rounded-2xl bg-purple-950/25 p-5 ring-1 ring-purple-400/20 sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
          <div className="min-w-0 sm:flex-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-300">Your Movie Personality</p>
            <h3 className="mt-2 break-words text-2xl font-black text-white sm:text-3xl">{dna.personality}</h3>
            <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-slate-300">{dna.personalityDescription}</p>
          </div>
          <div className="w-full sm:w-auto">
            <ShareMovieDnaButton
              dna={dna}
              percentile={percentile}
              totalMoviesRated={totalMoviesRated}
              username={username}
            />
          </div>
        </div>
        <div className="mt-5 border-t border-purple-400/15 pt-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">You Love</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {loveTags.map((tag) => (
              <span key={tag} className="rounded-full bg-yellow-400/10 px-3 py-1.5 text-xs font-black text-yellow-200 ring-1 ring-yellow-400/25">{tag}</span>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}

function CoreBreakdown({ dna }: { dna: MovieDnaResult }) {
  const [selectedGenre, setSelectedGenre] = useState<"all" | GenreKey>("all");
  const genreFilters = useMemo(
    () => getMovieDnaGenreFilters(dna.eligibleRatings),
    [dna.eligibleRatings]
  );
  const overallTraits = [
    ["Storyline", dna.storyAverage],
    ["Acting", dna.actingAverage],
    ["Rewatch Score", dna.rewatchAverage],
  ] as const;
  const selectedGenreDetails =
    selectedGenre === "all"
      ? null
      : genreFilters.find((genre) => genre.key === selectedGenre) ?? null;
  const traits =
    selectedGenreDetails
      ? getMovieDnaGenreQuestionAverages(
          dna.eligibleRatings,
          selectedGenreDetails.key
        )
      : overallTraits.map(([label, average]) => ({ average, key: label, label }));

  return (
    <div className={panelClass("p-5 sm:p-6")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-black text-white">How You Rate Movies</h3>
        <label className="flex items-center gap-2 text-xs font-black text-slate-400">
          <span>Genre</span>
          <select
            aria-label="Filter How You Rate Movies by genre"
            value={selectedGenreDetails?.key ?? "all"}
            onChange={(event) =>
              setSelectedGenre(event.target.value as "all" | GenreKey)
            }
            className="min-h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-white outline-none transition focus:border-yellow-300"
          >
            <option value="all">All Genres</option>
            {genreFilters.map((genre) => (
              <option key={genre.key} value={genre.key}>
                {genre.label} ({genre.count})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-5 space-y-4">
        {traits.map((trait) => {
          const percent =
            trait.average === null ? null : averageToPercent(trait.average);
          return (
            <div key={trait.key}>
              <div className="flex items-center justify-between gap-3 text-sm font-black">
                <span className="text-slate-200">{trait.label}</span>
                <span className="text-yellow-300">
                  {percent === null ? "Not yet rated" : `${percent}%`}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-purple-500"
                  style={{ width: `${percent ?? 0}%` }}
                  role="meter"
                  aria-label={`${trait.label} average`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent ?? 0}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs font-bold text-slate-500">
        {selectedGenreDetails
          ? `Based on your answers for ${selectedGenreDetails.count} fully rated ${selectedGenreDetails.label} ${selectedGenreDetails.count === 1 ? "movie" : "movies"}.`
          : "Based on your answers across all fully rated movies."}
      </p>
    </div>
  );
}

function GenreMoviesDialog({
  genre,
  movies,
  onClose,
}: {
  genre: string;
  movies: MovieDnaRating[];
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      aria-labelledby="genre-movies-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/80 px-3 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-purple-400/35 bg-slate-950 text-white shadow-2xl shadow-purple-950/40 sm:max-h-[88vh]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-4 sm:p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">
              Your Top Genres
            </p>
            <h2 id="genre-movies-dialog-title" className="mt-1 text-xl font-black sm:text-2xl">
              {genre} Movies
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {movies.length} fully rated {movies.length === 1 ? "movie" : "movies"}
            </p>
          </div>
          <button
            autoFocus
            type="button"
            aria-label={`Close ${genre} movies`}
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xl font-black text-slate-300 transition hover:border-yellow-400 hover:text-yellow-300"
          >
            ×
          </button>
        </div>

        <ol className="grid min-h-0 gap-2 overflow-y-auto p-3 sm:grid-cols-2 sm:gap-3 sm:p-4">
          {movies.map((movie) => (
            <li key={movie.id}>
              <Link
                href={movieHref({ id: movie.movieId, title: movie.movieTitle })}
                onClick={onClose}
                className="grid min-h-[92px] grid-cols-[52px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-slate-800 bg-black/30 p-2.5 transition hover:border-yellow-400/45 hover:bg-yellow-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
              >
                <span className="relative aspect-[2/3] w-[52px] overflow-hidden rounded-lg bg-slate-900">
                  <MoviePosterImage
                    src={posterUrl(movie.posterPath ?? null, "w342")}
                    fallbackMovieId={movie.movieId}
                    alt={`${movie.movieTitle} movie poster`}
                    sizes="52px"
                  />
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-black text-white">
                    {movie.movieTitle}
                  </span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">
                    {movie.releaseDate?.slice(0, 4) || "Year unknown"}
                  </span>
                  <span className="mt-1 block text-xs font-black text-yellow-300">
                    {Math.round(movie.popscore)}% PopScore
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>,
    document.body
  );
}

function GenreDna({ dna }: { dna: MovieDnaResult }) {
  const [selectedGenre, setSelectedGenre] = useState<MovieDnaGenreStat | null>(
    null
  );
  const selectedMovies = selectedGenre
    ? getMovieDnaRatingsForGenre(dna.eligibleRatings, selectedGenre.genre)
    : [];

  return (
    <div className={panelClass("p-5 sm:p-6")}>
      <h3 className="text-lg font-black text-white">Your Top Genres</h3>
      {dna.topGenres.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {dna.topGenres.map((genre) => (
            <article key={genre.genre} className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 p-1.5 pl-4">
                <h4 className="text-sm font-black text-yellow-200">{genre.genre}</h4>
                <button
                  type="button"
                  aria-label={`Show ${genre.count} rated ${genre.genre} ${genre.count === 1 ? "movie" : "movies"}`}
                  onClick={() => setSelectedGenre(genre)}
                  className="min-h-8 rounded-full bg-purple-500/15 px-3 text-xs font-black text-purple-200 transition hover:bg-yellow-400/15 hover:text-yellow-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
                >
                  {genre.count} {genre.count === 1 ? "movie" : "movies"}
                </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm font-bold leading-6 text-slate-400">
          Rate at least two movies in a genre to reveal your top genres.
        </p>
      )}
      {selectedGenre ? (
        <GenreMoviesDialog
          genre={selectedGenre.genre}
          movies={selectedMovies}
          onClose={() => setSelectedGenre(null)}
        />
      ) : null}
    </div>
  );
}

function Rankings({ dna }: { dna: MovieDnaResult }) {
  const [selected, setSelected] = useState<MovieDnaRankingKey>("top-rated");
  const [selectedGenre, setSelectedGenre] = useState<"all" | GenreKey>("all");
  const [showAll, setShowAll] = useState(false);
  const genreFilters = useMemo(
    () => getMovieDnaGenreFilters(dna.eligibleRatings),
    [dna.eligibleRatings]
  );
  const activeGenre =
    selectedGenre !== "all" &&
    genreFilters.some((genre) => genre.key === selectedGenre)
      ? selectedGenre
      : "all";
  const selectedOption = RANKING_OPTIONS.find(
    (option) => option.key === selected
  )!;
  const rankedMovies = useMemo(
    () => getMovieDnaRanking(dna.eligibleRatings, selected, activeGenre),
    [activeGenre, dna.eligibleRatings, selected]
  );
  const movies = showAll ? rankedMovies : rankedMovies.slice(0, 5);

  return (
    <div className={panelClass("min-w-0 overflow-hidden p-4 sm:p-6")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-black text-white">Your Movie Rankings</h3>
        <label className="flex items-center gap-2 text-xs font-black text-slate-400">
          <span>Genre</span>
          <select
            aria-label="Filter movie rankings by genre"
            value={activeGenre}
            onChange={(event) => {
              setSelectedGenre(event.target.value as "all" | GenreKey);
              setShowAll(false);
            }}
            className="min-h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-white outline-none transition focus:border-yellow-300"
          >
            <option value="all">All Genres</option>
            {genreFilters.map((genre) => (
              <option key={genre.key} value={genre.key}>
                {genre.label} ({genre.count})
              </option>
            ))}
          </select>
        </label>
      </div>
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
            onClick={() => {
              setSelected(option.key);
              setShowAll(false);
            }}
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

      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
        {selectedOption.description}
      </p>

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
                      ? `${Math.round(movie.relevantScore)}% PopScore`
                      : `${movie.relevantScore.toFixed(1)}/5 ${selectedOption.scoreLabel}`}
                  </span>
                  {selected !== "top-rated" ? (
                    <span className="text-yellow-300">
                      {Math.round(movie.popscore)}% PopScore
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {rankedMovies.length > 5 ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((current) => !current)}
            className="min-h-10 rounded-full border border-purple-400/35 bg-purple-500/10 px-5 text-xs font-black text-purple-200 transition hover:border-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300"
          >
            {showAll
              ? "Show Top 5"
              : `View All ${rankedMovies.length} Movies`}
          </button>
        </div>
      ) : null}
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

export default function MovieDnaSection({ percentile, ratings, totalMoviesRated, username }: MovieDnaSectionProps) {
  const dna = useMemo(() => calculateMovieDna(ratings), [ratings]);
  const count = dna.eligibleRatings.length;

  return (
    <section
      id="movie-dna"
      className="w-full min-w-0 scroll-mt-6 overflow-hidden rounded-3xl border border-purple-500/25 bg-slate-950/85 p-4 shadow-xl shadow-purple-950/15 sm:p-6"
      aria-labelledby="movie-dna-heading"
    >
      <div>
        <h2 id="movie-dna-heading" className="mt-1 text-2xl font-black text-white sm:text-3xl">Your Movie DNA</h2>
        <p className="mt-1 text-sm font-bold text-slate-400">A look at what makes you, you.</p>
      </div>

      <div className="mt-5">
        {count < 5 ? (
          <UnlockCard count={count} />
        ) : (
          <div className="space-y-4 sm:space-y-5">
            <SummaryCard dna={dna} percentile={percentile} totalMoviesRated={totalMoviesRated} username={username} />
            <GenreDna dna={dna} />
            <CoreBreakdown dna={dna} />
            <Rankings dna={dna} />
          </div>
        )}
      </div>
    </section>
  );
}
