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

function lovedPercentForMovie(movie: MovieSummary) {
  return Math.min(98, Math.max(62, Math.round((movie.vote_average ?? 7.4) * 10)));
}

function normalizeMoviePosterPath(path?: string | null) {
  const trimmedPath = path?.trim();

  if (
    !trimmedPath ||
    trimmedPath.toLowerCase() === "null" ||
    trimmedPath.toLowerCase() === "undefined"
  ) {
    return null;
  }

  return trimmedPath;
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

function DiscoveryPoster({ movie }: { movie: DiscoveryRecommendation }) {
  const posterKey = `${movie.id}:${movie.poster_path ?? ""}`;
  const [posterRecovery, setPosterRecovery] = useState<{
    failedPosterPath: string | null;
    fallbackPath: string | null;
    key: string;
  }>({
    failedPosterPath: null,
    fallbackPath: null,
    key: posterKey,
  });
  const primaryPath = normalizeMoviePosterPath(movie.poster_path);
  const fallbackPath =
    posterRecovery.key === posterKey
      ? normalizeMoviePosterPath(posterRecovery.fallbackPath)
      : null;
  const failedPosterPath =
    posterRecovery.key === posterKey ? posterRecovery.failedPosterPath : null;
  const activePath = fallbackPath ?? primaryPath;
  const poster =
    activePath && activePath !== failedPosterPath ? posterUrl(activePath) : null;

  useEffect(() => {
    let isCurrent = true;

    if (!movie.id || (primaryPath && failedPosterPath !== primaryPath)) {
      return () => {
        isCurrent = false;
      };
    }

    fetch(`/api/movie-poster?movie=${encodeURIComponent(String(movie.id))}`)
      .then((response) => response.json())
      .then((data: { posterPath?: string | null }) => {
        const nextPath = normalizeMoviePosterPath(data.posterPath);

        if (isCurrent && nextPath && nextPath !== primaryPath) {
          setPosterRecovery((current) => ({
            failedPosterPath:
              current.key === posterKey ? current.failedPosterPath : null,
            fallbackPath: nextPath,
            key: posterKey,
          }));
        }
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, [failedPosterPath, movie.id, posterKey, primaryPath]);

  return (
    <MoviePosterImage
      src={poster}
      alt={movie.title}
      sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
      className="object-cover transition duration-500 group-hover:scale-105"
      onLoadError={() => {
        if (activePath) {
          setPosterRecovery((current) => ({
            failedPosterPath: activePath,
            fallbackPath: current.key === posterKey ? current.fallbackPath : null,
            key: posterKey,
          }));
        }
      }}
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
    () => movies.slice(0, DISCOVERY_RECOMMENDATION_LIMIT),
    [movies]
  );

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

        setMovies((data.movies ?? []).slice(0, DISCOVERY_RECOMMENDATION_LIMIT));
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
          {isLoadingUser ? (
            <p className="text-sm font-bold text-slate-400">
              Checking your PopScore taste...
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 overflow-visible pb-1 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8">
          {PROFILE_GENRES.map((nextGenre) => (
            <button
              key={nextGenre.key}
              type="button"
              onClick={() => {
                if (genre !== nextGenre.key) {
                  setIsLoadingMovies(true);
                  setRecommendationMessage("");
                  setStatus("");
                  setGenre(nextGenre.key);
                }
              }}
              className={`inline-flex min-h-12 w-full max-w-full items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-black leading-none transition ${
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
            <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">
              {recommendationMode === "personalized"
                ? "Personalized Picks"
                : "Popular Genre Picks"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              {visibleMovies.length} {selectedGenre?.label ?? "Movie"} recommendations
            </h2>
          </div>
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
                  <DiscoveryPoster movie={movie} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute left-4 top-4 rounded-full border border-yellow-300/60 bg-black/75 px-3 py-1.5 text-sm font-black text-yellow-200 shadow-lg shadow-yellow-400/15">
                    {movie.tasteMatchScore}% Match
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-3">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-yellow-400 bg-black/70 text-xl font-black text-white shadow-lg shadow-yellow-400/20">
                      {movie.overallPopScore || lovedPercentForMovie(movie)}
                    </span>
                    <span className="text-xs font-black text-white">
                      PopScore
                      <span className="block text-[11px] font-bold text-slate-300">
                        {movie.totalRatings > 0
                          ? `${movie.totalRatings} ratings`
                          : "Trending pick"}
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
