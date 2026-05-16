"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MoviePosterImage from "@/app/components/movie-poster-image";
import {
  getCurrentUser,
  getWatchlist,
  removeFromWatchlist,
  WatchlistMovie,
} from "@/lib/profile-store";
import { posterUrl } from "@/lib/tmdb";

function yearFromDate(releaseDate?: string | null) {
  return releaseDate?.slice(0, 4) || "TBA";
}

function WatchlistPoster({ movie }: { movie: WatchlistMovie }) {
  const [fallbackPath, setFallbackPath] = useState<string | null>(null);
  const poster = posterUrl(movie.posterPath ?? fallbackPath ?? null);

  useEffect(() => {
    let isCurrent = true;

    if (movie.posterPath) {
      return () => {
        isCurrent = false;
      };
    }

    fetch(`/api/movie-poster?movie=${encodeURIComponent(movie.movieId)}`)
      .then((response) => response.json())
      .then((data: { posterPath?: string | null }) => {
        if (isCurrent && data.posterPath) {
          setFallbackPath(data.posterPath);
        }
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, [movie.movieId, movie.posterPath]);

  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-900 shadow-xl shadow-black/30">
      <MoviePosterImage
        src={poster}
        alt={movie.movieTitle}
        sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
        className="object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
    </div>
  );
}

function WatchlistEmptyState() {
  return (
    <section className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/75 p-8 text-center shadow-2xl shadow-black/30">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-3xl">
        ♡
      </div>
      <h2 className="mt-5 text-2xl font-black text-white">
        Your watchlist is empty
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-400">
        Save movies from the homepage or movie detail pages and they will show
        up here.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-yellow-400 px-6 text-sm font-black text-black shadow-lg shadow-yellow-400/25 transition hover:bg-yellow-300"
      >
        Discover Movies
      </Link>
    </section>
  );
}

export default function WatchlistClient() {
  const [watchlist, setWatchlist] = useState<WatchlistMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [removingMovieId, setRemovingMovieId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let isCurrent = true;

    getCurrentUser()
      .then((user) => {
        if (!isCurrent) {
          return;
        }

        if (!user) {
          setIsSignedIn(false);
          setIsLoading(false);
          return;
        }

        return getWatchlist(user.id).then((nextWatchlist) => {
          if (!isCurrent) {
            return;
          }

          setWatchlist(nextWatchlist);
          setIsLoading(false);
        });
      })
      .catch((error: Error) => {
        if (!isCurrent) {
          return;
        }

        setStatus(error.message);
        setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const genreCount = useMemo(() => {
    return new Set(
      watchlist
        .map((movie) => movie.genreNames[0] ?? movie.genre)
        .filter(Boolean)
    ).size;
  }, [watchlist]);

  if (isLoading) {
    return (
      <section className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/75 p-8 font-bold text-slate-300 shadow-2xl shadow-black/30">
        Loading your watchlist...
      </section>
    );
  }

  if (!isSignedIn) {
    return (
      <section className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/75 p-8 text-center shadow-2xl shadow-black/30">
        <h2 className="text-2xl font-black text-white">Sign in to see your watchlist</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-400">
          Your saved movies are connected to your PopFile account.
        </p>
        <Link
          href={`/profile/edit?returnTo=${encodeURIComponent("/watchlist")}`}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-yellow-400 px-6 text-sm font-black text-black shadow-lg shadow-yellow-400/25 transition hover:bg-yellow-300"
        >
          Sign In
        </Link>
      </section>
    );
  }

  if (watchlist.length === 0) {
    return <WatchlistEmptyState />;
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/75 p-5">
          <p className="text-3xl font-black text-yellow-300">{watchlist.length}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Saved Movies
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/75 p-5">
          <p className="text-3xl font-black text-yellow-300">{genreCount}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Genres
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/75 p-5">
          <p className="text-3xl font-black text-yellow-300">Next</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Ready To Rate
          </p>
        </div>
      </div>

      {status ? (
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100">
          {status}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {watchlist.map((movie) => {
          const detailsHref = `/movie/${movie.movieId}?returnTo=${encodeURIComponent(
            "/watchlist"
          )}`;
          const rateHref = `/rate?movie=${movie.movieId}&returnTo=${encodeURIComponent(
            "/watchlist"
          )}&from=watchlist`;

          return (
            <article
              key={movie.id}
              className="group overflow-hidden rounded-[1.5rem] border border-slate-800/90 bg-slate-950/85 p-4 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/50 hover:shadow-yellow-400/10"
            >
              <Link href={detailsHref} className="block">
                <WatchlistPoster movie={movie} />
              </Link>
              <div className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-xl font-black leading-tight text-white">
                      {movie.movieTitle}
                    </h2>
                    <p className="mt-2 text-sm font-bold text-slate-400">
                      {movie.genreNames[0] ?? movie.genre ?? "Movie"} ·{" "}
                      {yearFromDate(movie.releaseDate)}
                    </p>
                  </div>
                  <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-300">
                    Saved
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                  <Link
                    href={rateHref}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-yellow-400 px-4 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
                  >
                    Rate Now
                  </Link>
                  <button
                    type="button"
                    disabled={removingMovieId === movie.movieId}
                    onClick={() => {
                      setRemovingMovieId(movie.movieId);
                      setStatus("");
                      removeFromWatchlist(movie.movieId)
                        .then(() => {
                          setWatchlist((current) =>
                            current.filter(
                              (item) => item.movieId !== movie.movieId
                            )
                          );
                        })
                        .catch((error: Error) => setStatus(error.message))
                        .finally(() => setRemovingMovieId(null));
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-700 px-4 text-sm font-black text-slate-300 transition hover:border-yellow-400 hover:text-yellow-300 disabled:opacity-60"
                  >
                    {removingMovieId === movie.movieId ? "..." : "Remove"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
