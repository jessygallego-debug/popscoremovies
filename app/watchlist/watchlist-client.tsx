"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MobileFilterMenu from "@/app/components/mobile-filter-menu";
import MoviePosterImage from "@/app/components/movie-poster-image";
import { MOVIE_FILTER_GENRES } from "@/lib/profile-config";
import {
  getCurrentUser,
  getWatchlist,
  removeFromWatchlist,
  WatchlistMovie,
} from "@/lib/profile-store";
import { posterUrl } from "@/lib/tmdb";
import { movieHref } from "@/lib/urls";

function yearFromDate(releaseDate?: string | null) {
  return releaseDate?.slice(0, 4) || "TBA";
}

function primaryGenreForMovie(movie: WatchlistMovie) {
  return movie.genreNames[0] ?? movie.genre ?? "Movie";
}

function filterGenresForMovie(movie: WatchlistMovie) {
  return Array.from(
    new Set(
      [...(movie.genreNames ?? []), movie.genre].filter(
        (genre): genre is string => Boolean(genre)
      )
    )
  );
}

function WatchlistPoster({ movie }: { movie: WatchlistMovie }) {
  const poster = posterUrl(movie.posterPath ?? null);

  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl shadow-black/30 sm:rounded-[1.35rem]">
      <MoviePosterImage
        src={poster}
        alt={`${movie.movieTitle} saved movie poster`}
        sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
        className="object-cover transition duration-500 group-hover:scale-105"
        fallbackMovieId={movie.movieId}
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
        href="/discover"
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
  const [selectedGenre, setSelectedGenre] = useState("all");
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
        .map(primaryGenreForMovie)
        .filter(Boolean)
    ).size;
  }, [watchlist]);

  const genreFilters = useMemo(() => {
    const genres = new Set(
      MOVIE_FILTER_GENRES.map((nextGenre) => nextGenre.label)
    );
    watchlist
      .flatMap(filterGenresForMovie)
      .forEach((genre) => genres.add(genre));

    return [
      "all",
      ...Array.from(genres).sort((firstGenre, secondGenre) =>
        firstGenre.localeCompare(secondGenre)
      ),
    ];
  }, [watchlist]);
  const activeGenre =
    selectedGenre !== "all" && genreFilters.includes(selectedGenre)
      ? selectedGenre
      : "all";

  const filteredWatchlist = useMemo(() => {
    if (activeGenre === "all") {
      return watchlist;
    }

    return watchlist.filter((movie) =>
      filterGenresForMovie(movie).includes(activeGenre)
    );
  }, [activeGenre, watchlist]);

  if (isLoading) {
    return (
      <section className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/75 p-8 font-bold text-slate-300 shadow-2xl shadow-black/30">
        Loading your watchlist...
      </section>
    );
  }

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/75 p-3 sm:p-5">
          <p className="text-2xl font-black text-yellow-300 sm:text-3xl">{watchlist.length}</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 sm:text-xs sm:tracking-[0.16em]">
            Saved Movies
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/75 p-3 sm:p-5">
          <p className="text-2xl font-black text-yellow-300 sm:text-3xl">{genreCount}</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 sm:text-xs sm:tracking-[0.16em]">
            Genres
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/75 p-3 sm:p-5">
          <p className="text-2xl font-black text-yellow-300 sm:text-3xl">Next</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 sm:text-xs sm:tracking-[0.16em]">
            Ready To Rate
          </p>
        </div>
      </div>

      {status ? (
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100">
          {status}
        </div>
      ) : null}

      <div className="relative z-[250] overflow-visible rounded-[1.5rem] border border-slate-800/80 bg-slate-950/65 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white sm:text-2xl">
              Filter Watchlist
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400 sm:text-sm">
              Keep your saved movies organized by genre.
            </p>
          </div>
          <p className="text-xs font-black text-yellow-300 sm:text-sm">
            {filteredWatchlist.length} shown
          </p>
        </div>
        <MobileFilterMenu
          label="Genre filter"
          onSelect={setSelectedGenre}
          options={genreFilters.map((genre) => ({
            label: genre === "all" ? "All Movies" : genre,
            value: genre,
          }))}
          selectedValue={activeGenre}
        />

        <div className="hidden gap-2 sm:gap-3 md:grid md:grid-cols-8">
          {genreFilters.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => setSelectedGenre(genre)}
              className={`inline-flex min-h-9 max-w-full items-center justify-center rounded-full border px-2 py-1.5 text-center text-[11px] font-black leading-tight transition sm:min-h-10 sm:px-3 sm:text-sm md:min-h-11 md:px-4 ${
                activeGenre === genre
                  ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-300 shadow-inner shadow-black/20"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-yellow-400 hover:text-yellow-300"
              }`}
            >
              {genre === "all" ? "All Movies" : genre}
            </button>
          ))}
        </div>
      </div>

      {!isSignedIn ? (
        <section className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/75 p-8 text-center shadow-2xl shadow-black/30">
          <h2 className="text-2xl font-black text-white">
            Sign in to see your watchlist
          </h2>
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
      ) : null}

      {isSignedIn && watchlist.length === 0 ? <WatchlistEmptyState /> : null}

      {isSignedIn && watchlist.length > 0 && filteredWatchlist.length === 0 ? (
        <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/75 p-8 text-center shadow-2xl shadow-black/30">
          <h2 className="text-2xl font-black text-white">
            No saved movies in this genre
          </h2>
          <button
            type="button"
            onClick={() => setSelectedGenre("all")}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-yellow-400 px-5 text-sm font-black text-black transition hover:bg-yellow-300"
          >
            Show All Movies
          </button>
        </div>
      ) : null}

      {isSignedIn && filteredWatchlist.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWatchlist.map((movie) => {
            const detailsHref = `${movieHref({
              id: movie.movieId,
              title: movie.movieTitle,
            })}?returnTo=${encodeURIComponent("/watchlist")}`;
            const rateHref = `/rate?movie=${
              movie.movieId
            }&returnTo=${encodeURIComponent("/watchlist")}&from=watchlist`;

            return (
              <article
                key={movie.id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/85 p-3 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/50 hover:shadow-yellow-400/10 sm:rounded-[1.5rem] sm:p-4"
              >
                <Link href={detailsHref} className="block">
                  <WatchlistPoster movie={movie} />
                </Link>
                <div className="flex flex-1 flex-col pt-3 sm:pt-4">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-xl">
                        {movie.movieTitle}
                      </h2>
                      <p className="mt-1 text-[11px] font-bold text-slate-400 sm:mt-2 sm:text-sm">
                        {primaryGenreForMovie(movie)} ·{" "}
                        {yearFromDate(movie.releaseDate)}
                      </p>
                    </div>
                    <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2 py-1 text-[10px] font-black text-yellow-300 sm:px-3 sm:text-xs">
                      Saved
                    </span>
                  </div>

                  <div className="mt-auto grid grid-cols-1 gap-2 pt-3 sm:grid-cols-[1fr_auto] sm:pt-4">
                    <Link
                      href={rateHref}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-yellow-400 px-3 text-xs font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:min-h-11 sm:px-4 sm:text-sm"
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
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-700 px-3 text-xs font-black text-slate-300 transition hover:border-yellow-400 hover:text-yellow-300 disabled:opacity-60 sm:min-h-11 sm:px-4 sm:text-sm"
                    >
                      {removingMovieId === movie.movieId ? "..." : "Remove"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
