"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AddToWatchlistButton from "@/app/components/add-to-watchlist-button";
import MoviePosterImage from "@/app/components/movie-poster-image";
import { PROFILE_GENRES } from "@/lib/profile-config";
import { getCurrentUser } from "@/lib/profile-store";
import { MovieSummary, posterUrl } from "@/lib/tmdb";

const DISCOVERY_RECOMMENDATION_LIMIT = 10;

function yearFromDate(releaseDate?: string | null) {
  return releaseDate?.slice(0, 4) || "TBA";
}

type DiscoveryRecommendation = MovieSummary & {
  explanation: string;
  overallPopScore: number;
  recommendationMode: "fallback" | "personalized";
  tasteMatchScore: number;
  totalRatings: number;
};

type RecommendationResponse = {
  highRatedCount: number;
  message: string;
  mode: "fallback" | "personalized";
  movies: DiscoveryRecommendation[];
};

function limitRecommendations(movies: DiscoveryRecommendation[]) {
  const seenMovieIds = new Set<number>();

  return movies
    .filter((movie) => {
      if (seenMovieIds.has(movie.id)) {
        return false;
      }

      seenMovieIds.add(movie.id);
      return true;
    })
    .slice(0, DISCOVERY_RECOMMENDATION_LIMIT);
}

function DiscoveryPoster({ movie }: { movie: DiscoveryRecommendation }) {
  const poster = posterUrl(movie.poster_path);

  return (
    <MoviePosterImage
      src={poster}
      alt={movie.title}
      sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
      className="object-cover transition duration-500 group-hover:scale-105"
      fallbackMovieId={String(movie.id)}
      unoptimized
    />
  );
}

export default function DiscoverClient() {
  const [genre, setGenre] = useState(PROFILE_GENRES[0].key);
  const [movies, setMovies] = useState<DiscoveryRecommendation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [recommendationMessage, setRecommendationMessage] = useState("");
  const [recommendationMode, setRecommendationMode] =
    useState<RecommendationResponse["mode"]>("fallback");
  const [status, setStatus] = useState("");

  const selectedGenre = useMemo(
    () => PROFILE_GENRES.find((nextGenre) => nextGenre.key === genre),
    [genre]
  );
  const visibleMovies = useMemo(
    () => limitRecommendations(movies),
    [movies]
  );
  const handleGenreChange = (nextGenreKey: string) => {
    if (genre === nextGenreKey) {
      return;
    }

    setIsLoadingMovies(true);
    setRecommendationMessage("");
    setStatus("");
    setGenre(nextGenreKey);
  };

  useEffect(() => {
    let isCurrent = true;

    getCurrentUser()
      .then((user) => {
        if (!isCurrent) {
          return;
        }

        setUserId(user?.id ?? null);
        setIsLoadingUser(false);
      })
      .catch((error: Error) => {
        if (!isCurrent) {
          return;
        }

        setStatus(error.message);
        setIsLoadingUser(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const params = new URLSearchParams({ genre });

    if (isLoadingUser) {
      return () => {
        isCurrent = false;
      };
    }

    if (userId) {
      params.set("userId", userId);
    }

    fetch(`/api/recommendations?${params.toString()}`)
      .then((response) => response.json())
      .then((data: RecommendationResponse) => {
        if (!isCurrent) {
          return;
        }

        setMovies(limitRecommendations(data.movies ?? []));
        setRecommendationMessage(data.message ?? "");
        setRecommendationMode(data.mode ?? "fallback");
        setStatus("");
      })
      .catch((error: Error) => {
        if (!isCurrent) {
          return;
        }

        setMovies([]);
        setRecommendationMessage("");
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
  }, [genre, isLoadingUser, userId]);

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="rounded-[1.5rem] border border-slate-800/80 bg-slate-950/65 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5 sm:gap-4">
          <div>
            <h2 className="text-xl font-black text-white sm:text-3xl">
              Explore By Genre
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400 sm:mt-2 sm:text-sm">
              Pick a lane and find movies that match the mood.
            </p>
          </div>
          {isLoadingUser ? (
            <p className="text-xs font-bold text-slate-400 sm:text-sm">
              Checking your PopScore taste...
            </p>
          ) : null}
        </div>

        <label className="block md:hidden">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Genre filter
          </span>
          <select
            value={genre}
            onChange={(event) => handleGenreChange(event.target.value)}
            className="min-h-12 w-full rounded-full border border-yellow-400/35 bg-[#020617] px-4 text-sm font-black text-yellow-300 shadow-inner shadow-black/30 outline-none transition focus:border-yellow-300 focus:ring-2 focus:ring-yellow-400/20"
          >
            {PROFILE_GENRES.map((nextGenre) => (
              <option key={nextGenre.key} value={nextGenre.key}>
                {nextGenre.label}
              </option>
            ))}
          </select>
        </label>

        <div className="hidden gap-2 overflow-visible pb-1 md:grid md:grid-cols-5 md:gap-3 lg:grid-cols-8">
          {PROFILE_GENRES.map((nextGenre) => (
            <button
              key={nextGenre.key}
              type="button"
              onClick={() => handleGenreChange(nextGenre.key)}
              className={`inline-flex min-h-9 w-full max-w-full items-center justify-center rounded-full border px-2 py-1.5 text-center text-[11px] font-black leading-tight transition sm:min-h-10 sm:px-3 sm:text-sm md:min-h-12 md:px-4 ${
                genre === nextGenre.key
                  ? "border-yellow-400 bg-yellow-400 text-black shadow-lg shadow-yellow-400/25"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-yellow-400 hover:text-yellow-300"
              }`}
            >
              {nextGenre.label}
            </button>
          ))}
          {PROFILE_GENRES.length % 8 ? (
            <span aria-hidden="true" className="hidden lg:block" />
          ) : null}
        </div>
      </div>

      {status ? (
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100">
          {status}
        </div>
      ) : null}

      {!isLoadingMovies && recommendationMessage ? (
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100">
          {recommendationMessage}
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

      {!isLoadingMovies && visibleMovies.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300 sm:text-xs sm:tracking-[0.22em]">
              {recommendationMode === "personalized"
                ? "Personalized Picks"
                : "Popular Genre Picks"}
            </p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
              {visibleMovies.length} {selectedGenre?.label ?? "Movie"} recommendations
            </h2>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
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
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/85 p-3 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/50 hover:shadow-yellow-400/10 sm:rounded-[1.5rem] sm:p-4"
            >
              <Link href={detailsHref} className="block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl shadow-black/30 sm:rounded-[1.35rem]">
                  <DiscoveryPoster movie={movie} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute left-2 top-2 rounded-full border border-yellow-300/60 bg-black/75 px-2 py-1 text-[10px] font-black text-yellow-200 shadow-lg shadow-yellow-400/15 sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-sm">
                    {movie.tasteMatchScore}% Match
                  </div>
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 sm:bottom-4 sm:left-4 sm:gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-yellow-400 bg-black/70 text-sm font-black text-white shadow-lg shadow-yellow-400/20 sm:h-14 sm:w-14 sm:text-xl">
                      {movie.totalRatings > 0 ? movie.overallPopScore : "NR"}
                    </span>
                    <span className="text-[10px] font-black text-white sm:text-xs">
                      PopScore
                      <span className="block text-[9px] font-bold text-slate-300 sm:text-[11px]">
                        {movie.totalRatings > 0
                          ? `${movie.totalRatings} ratings`
                          : "Trending pick"}
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
              <div className="flex flex-1 flex-col pt-3 sm:pt-4">
                <h2 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-xl">
                  {movie.title}
                </h2>
                <p className="mt-1 text-[11px] font-bold text-slate-400 sm:mt-2 sm:text-sm">
                  {selectedGenre?.label ?? "Movie"} ·{" "}
                  {yearFromDate(movie.release_date)}
                </p>

                <div className="mt-auto grid gap-2 pt-3 sm:pt-4">
                  <Link
                    href={rateHref}
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-yellow-400 px-3 text-xs font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:min-h-11 sm:px-4 sm:text-sm"
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
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-700 px-3 text-xs font-black text-slate-300 transition hover:border-yellow-400 hover:text-yellow-300 sm:min-h-11 sm:px-4 sm:text-sm"
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
