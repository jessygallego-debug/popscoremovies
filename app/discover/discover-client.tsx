"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AddToWatchlistButton from "@/app/components/add-to-watchlist-button";
import MoviePosterImage from "@/app/components/movie-poster-image";
import { PROFILE_GENRES } from "@/lib/profile-config";
import {
  getCurrentUser,
  getUserRatings,
  UserMovieRating,
} from "@/lib/profile-store";
import { MovieSummary, posterUrl } from "@/lib/tmdb";

function yearFromDate(releaseDate?: string | null) {
  return releaseDate?.slice(0, 4) || "TBA";
}

function lovedPercentForMovie(movie: MovieSummary) {
  return Math.min(98, Math.max(62, Math.round((movie.vote_average ?? 7.4) * 10)));
}

function hasPopScoreRating(rating: UserMovieRating) {
  return Object.values(rating.ratings).some((value) => value > 0);
}

export default function DiscoverClient() {
  const [genre, setGenre] = useState(PROFILE_GENRES[0].key);
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [ratedMovieIds, setRatedMovieIds] = useState<Set<string>>(new Set());
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);
  const [isLoadingRatings, setIsLoadingRatings] = useState(true);
  const [status, setStatus] = useState("");

  const selectedGenre = useMemo(
    () => PROFILE_GENRES.find((nextGenre) => nextGenre.key === genre),
    [genre]
  );

  useEffect(() => {
    let isCurrent = true;

    getCurrentUser()
      .then((user) => {
        if (!isCurrent) {
          return;
        }

        if (!user) {
          setIsLoadingRatings(false);
          return;
        }

        return getUserRatings(user.id).then((ratings) => {
          if (!isCurrent) {
            return;
          }

          setRatedMovieIds(
            new Set(
              ratings
                .filter(hasPopScoreRating)
                .map((rating) => rating.movieId)
            )
          );
          setIsLoadingRatings(false);
        });
      })
      .catch((error: Error) => {
        if (!isCurrent) {
          return;
        }

        setStatus(error.message);
        setIsLoadingRatings(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    fetch(`/api/recommendations?genre=${encodeURIComponent(genre)}`)
      .then((response) => response.json())
      .then((data: { movies?: MovieSummary[] }) => {
        if (!isCurrent) {
          return;
        }

        setMovies(data.movies ?? []);
      })
      .catch((error: Error) => {
        if (!isCurrent) {
          return;
        }

        setMovies([]);
        setStatus(error.message);
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingMovies(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [genre]);

  const visibleMovies = useMemo(() => {
    return movies.filter((movie) => !ratedMovieIds.has(String(movie.id)));
  }, [movies, ratedMovieIds]);

  return (
    <section className="space-y-6">
      <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/65 p-5 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white sm:text-3xl">
              Explore By Genre
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              Pick a lane and find movies that match the mood.
            </p>
          </div>
          {isLoadingRatings ? (
            <p className="text-sm font-bold text-slate-400">
              Checking your rated movies...
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 overflow-visible pb-1">
          {PROFILE_GENRES.map((nextGenre) => (
            <button
              key={nextGenre.key}
              type="button"
              onClick={() => {
                if (genre !== nextGenre.key) {
                  setIsLoadingMovies(true);
                  setGenre(nextGenre.key);
                }
              }}
              className={`inline-flex min-h-12 max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-5 py-2 text-sm font-black leading-none transition ${
                genre === nextGenre.key
                  ? "border-yellow-400 bg-yellow-400 text-black shadow-lg shadow-yellow-400/25"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-yellow-400 hover:text-yellow-300"
              }`}
            >
              {nextGenre.label}
            </button>
          ))}
        </div>
      </div>

      {status ? (
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100">
          {status}
        </div>
      ) : null}

      {isLoadingMovies ? (
        <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/75 p-8 font-bold text-slate-300 shadow-2xl shadow-black/30">
          Loading {selectedGenre?.label ?? "movie"} picks...
        </div>
      ) : null}

      {!isLoadingMovies && visibleMovies.length === 0 ? (
        <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/75 p-8 text-center shadow-2xl shadow-black/30">
          <h2 className="text-2xl font-black text-white">
            No new picks here yet
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-400">
            Try another genre or check back after more movies are available.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleMovies.map((movie) => {
          const detailsHref = `/movie/${movie.id}?returnTo=${encodeURIComponent(
            "/discover"
          )}`;
          const rateHref = `/rate?movie=${movie.id}&returnTo=${encodeURIComponent(
            "/discover"
          )}&from=discover`;

          return (
            <article
              key={movie.id}
              className="group overflow-hidden rounded-[1.5rem] border border-slate-800/90 bg-slate-950/85 p-4 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/50 hover:shadow-yellow-400/10"
            >
              <Link href={detailsHref} className="block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-900 shadow-xl shadow-black/30">
                  <MoviePosterImage
                    src={posterUrl(movie.poster_path)}
                    alt={movie.title}
                    sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-3">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-yellow-400 bg-black/70 text-xl font-black text-white shadow-lg shadow-yellow-400/20">
                      {lovedPercentForMovie(movie)}
                    </span>
                    <span className="text-xs font-black text-white">
                      {selectedGenre?.label ?? "Movie"} Fans
                      <span className="block text-[11px] font-bold text-slate-300">
                        PopScore
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
              <div className="pt-4">
                <h2 className="line-clamp-2 text-xl font-black leading-tight text-white">
                  {movie.title}
                </h2>
                <p className="mt-2 text-sm font-bold text-slate-400">
                  {selectedGenre?.label ?? "Movie"} ·{" "}
                  {yearFromDate(movie.release_date)}
                </p>

                <div className="mt-4 grid gap-2">
                  <Link
                    href={rateHref}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-yellow-400 px-4 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
                  >
                    Rate Now
                  </Link>
                  <AddToWatchlistButton
                    movie={{
                      genre: selectedGenre?.key,
                      genreNames: selectedGenre ? [selectedGenre.label] : [],
                      movieId: String(movie.id),
                      movieTitle: movie.title,
                      posterPath: movie.poster_path,
                      releaseDate: movie.release_date,
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-700 px-4 text-sm font-black text-slate-300 transition hover:border-yellow-400 hover:text-yellow-300"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
