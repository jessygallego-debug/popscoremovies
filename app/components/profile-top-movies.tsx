"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MoviePosterImage from "@/app/components/movie-poster-image";
import {
  updateProfileTopMovies,
  type ProfileTopMovie,
  type UserMovieRating,
} from "@/lib/profile-store";
import { posterUrl } from "@/lib/tmdb";
import { movieHref } from "@/lib/urls";

type MovieSuggestion = {
  genreNames?: string[];
  id: number;
  posterPath?: string | null;
  releaseDate?: string;
  title: string;
};

type ProfileTopMoviesProps = {
  initialMovies: ProfileTopMovie[];
  isOwnProfile: boolean;
  ratings: UserMovieRating[];
};

function asTopMovie(movie: MovieSuggestion): ProfileTopMovie {
  return {
    genreNames: movie.genreNames ?? [],
    movieId: String(movie.id),
    movieTitle: movie.title,
    posterPath: movie.posterPath ?? null,
    releaseDate: movie.releaseDate ?? null,
  };
}

function yearFor(movie: ProfileTopMovie) {
  return movie.releaseDate?.slice(0, 4) || "Year unknown";
}

export default function ProfileTopMovies({
  initialMovies,
  isOwnProfile,
  ratings,
}: ProfileTopMoviesProps) {
  const [movies, setMovies] = useState(initialMovies.slice(0, 5));
  const [draftMovies, setDraftMovies] = useState(initialMovies.slice(0, 5));
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [status, setStatus] = useState("");
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const ratingsByMovieId = useMemo(
    () => new Map(ratings.map((rating) => [rating.movieId, rating])),
    [ratings]
  );

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) setIsOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, isSaving]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!isOpen || trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetch(
        `/api/search-suggestions?${new URLSearchParams({ query: trimmedQuery })}`,
        { signal: controller.signal }
      )
        .then(async (response) => {
          if (!response.ok) throw new Error("Search is unavailable right now.");
          return response.json() as Promise<{ suggestions?: MovieSuggestion[] }>;
        })
        .then((data) => {
          setSuggestions(data.suggestions ?? []);
          setSearchError("");
          setIsSearching(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
            setSearchError("Movie search is unavailable right now.");
            setIsSearching(false);
          }
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isOpen, query]);

  function openEditor() {
    setDraftMovies(movies);
    setQuery("");
    setSuggestions([]);
    setSearchError("");
    setIsSearching(false);
    setStatus("");
    setIsOpen(true);
  }

  function moveMovie(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draftMovies.length) return;

    setDraftMovies((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function saveMovies() {
    setIsSaving(true);
    setStatus("");

    try {
      const savedMovies = await updateProfileTopMovies(draftMovies);
      setMovies(savedMovies);
      setDraftMovies(savedMovies);
      setIsOpen(false);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Your Top 5 could not be saved. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const dialog =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/80 p-3 py-8 backdrop-blur-sm sm:p-6 sm:py-14"
            role="dialog"
            aria-modal="true"
            aria-labelledby="top-five-dialog-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isSaving) {
                setIsOpen(false);
              }
            }}
          >
            <section className="w-full max-w-2xl rounded-3xl border border-yellow-400/30 bg-slate-950 p-4 text-white shadow-2xl shadow-purple-950/40 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">Your favorites</p>
                  <h2 id="top-five-dialog-title" className="mt-1 text-2xl font-black">Choose Your Top 5</h2>
                  <p className="mt-1 text-sm font-medium text-slate-400">Search any movie, then arrange your picks from #1 to #5.</p>
                </div>
                <button
                  type="button"
                  aria-label="Close Top 5 editor"
                  disabled={isSaving}
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 font-black text-slate-300 transition hover:border-yellow-300 hover:text-white disabled:opacity-50"
                >
                  X
                </button>
              </div>

              <ol className="mt-5 space-y-2" aria-label="Selected Top 5 movies">
                {draftMovies.map((movie, index) => (
                  <li key={movie.movieId} className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-slate-800 bg-black/30 p-2.5">
                    <span className="text-center text-lg font-black text-yellow-300">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{movie.movieTitle}</p>
                      <p className="text-xs font-bold text-slate-500">{yearFor(movie)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" aria-label={`Move ${movie.movieTitle} up`} disabled={index === 0} onClick={() => moveMovie(index, -1)} className="h-9 w-9 rounded-xl border border-slate-700 font-black text-slate-300 transition hover:border-yellow-300 hover:text-yellow-300 disabled:opacity-25">↑</button>
                      <button type="button" aria-label={`Move ${movie.movieTitle} down`} disabled={index === draftMovies.length - 1} onClick={() => moveMovie(index, 1)} className="h-9 w-9 rounded-xl border border-slate-700 font-black text-slate-300 transition hover:border-yellow-300 hover:text-yellow-300 disabled:opacity-25">↓</button>
                      <button type="button" aria-label={`Remove ${movie.movieTitle}`} onClick={() => setDraftMovies((current) => current.filter((item) => item.movieId !== movie.movieId))} className="h-9 w-9 rounded-xl border border-red-400/30 font-black text-red-300 transition hover:bg-red-400/10">×</button>
                    </div>
                  </li>
                ))}
              </ol>

              {draftMovies.length < 5 ? (
                <div className="mt-5">
                  <label htmlFor="top-five-search" className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">Add a movie</label>
                  <input
                    id="top-five-search"
                    type="search"
                    value={query}
                    onChange={(event) => {
                      const nextQuery = event.target.value;
                      setQuery(nextQuery);
                      setSearchError("");
                      setIsSearching(nextQuery.trim().length >= 2);
                      if (nextQuery.trim().length < 2) setSuggestions([]);
                    }}
                    placeholder="Search the full movie catalog..."
                    className="mt-2 min-h-12 w-full rounded-2xl border border-slate-700 bg-black/35 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-yellow-300"
                  />
                  {searchError ? <p className="mt-2 text-sm font-bold text-red-300">{searchError}</p> : null}
                  {query.trim().length >= 2 && !searchError ? (
                    <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-slate-800 bg-black/25 p-2">
                      {suggestions.length ? suggestions.map((movie) => {
                        const isSelected = draftMovies.some((item) => item.movieId === String(movie.id));
                        return (
                          <button
                            key={movie.id}
                            type="button"
                            disabled={isSelected}
                            onClick={() => {
                              setDraftMovies((current) => [...current, asTopMovie(movie)].slice(0, 5));
                              setQuery("");
                              setSuggestions([]);
                              setIsSearching(false);
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-yellow-400 hover:text-black disabled:cursor-default disabled:opacity-45"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-black">{movie.title}</span>
                              <span className="text-xs font-bold opacity-65">{movie.releaseDate?.slice(0, 4) || "Year unknown"}</span>
                            </span>
                            <span className="text-xs font-black">{isSelected ? "Selected" : "Add"}</span>
                          </button>
                        );
                      }) : <p className="px-3 py-4 text-center text-sm font-bold text-slate-500">{isSearching ? "Searching…" : "No matching movies found."}</p>}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-yellow-400/10 px-3 py-2 text-center text-xs font-black text-yellow-200">Your five spots are filled. Remove a movie to choose another.</p>
              )}

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={isSaving} onClick={() => setIsOpen(false)} className="min-h-11 rounded-2xl border border-slate-700 px-5 text-sm font-black text-slate-300 transition hover:border-slate-500 disabled:opacity-50">Cancel</button>
                <button type="button" disabled={isSaving} onClick={saveMovies} className="min-h-11 rounded-2xl bg-yellow-400 px-6 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60">{isSaving ? "Saving…" : "Save My Top 5"}</button>
              </div>
              {status ? <p role="status" className="mt-3 text-center text-sm font-bold text-red-300">{status}</p> : null}
            </section>
          </div>,
          document.body
        )
      : null;

  return (
    <section className="rounded-2xl border border-slate-800 bg-black/30 p-3 sm:p-5" aria-labelledby="top-five-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-yellow-300">All-time favorites</p>
          <h3 id="top-five-heading" className="mt-1 text-lg font-black text-white sm:text-xl">My Top 5 Movies of All Time</h3>
        </div>
        {isOwnProfile ? (
          <button type="button" onClick={openEditor} className="min-h-9 shrink-0 rounded-xl border border-yellow-400/35 bg-yellow-400/10 px-3 text-xs font-black text-yellow-200 transition hover:bg-yellow-400/20 sm:min-h-10 sm:px-4">
            {movies.length ? "Edit Top 5" : "Choose Top 5"}
          </button>
        ) : null}
      </div>

      {movies.length ? (
        <ol className="mt-3 grid grid-cols-5 gap-1.5 sm:mt-4 sm:gap-3">
          {movies.map((movie, index) => {
            const rating = ratingsByMovieId.get(movie.movieId);
            return (
              <li key={movie.movieId} className="min-w-0">
                <Link href={movieHref({ id: movie.movieId, title: movie.movieTitle })} className="group block min-w-0">
                  <span className="relative block aspect-[2/3] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 transition group-hover:border-yellow-300 sm:rounded-xl">
                    <MoviePosterImage src={posterUrl(movie.posterPath, "w342")} fallbackMovieId={movie.movieId} alt={`${movie.movieTitle} movie poster`} sizes="(max-width: 640px) 18vw, 120px" />
                    <span className="absolute left-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-yellow-300/60 bg-black/85 px-1 text-xs font-black text-yellow-300 sm:left-2 sm:top-2 sm:h-8 sm:min-w-8 sm:text-sm">{index + 1}</span>
                  </span>
                  <span className="mt-1.5 block line-clamp-2 text-[10px] font-black leading-tight text-white group-hover:text-yellow-200 sm:text-sm">{movie.movieTitle}</span>
                  <span className="mt-1 hidden text-xs font-bold text-slate-500 sm:block">{rating ? `${rating.popscore}% PopScore` : yearFor(movie)}</span>
                </Link>
              </li>
            );
          })}
          {isOwnProfile ? Array.from({ length: 5 - movies.length }, (_, index) => (
            <li key={`empty-${index}`} aria-label={`Empty Top 5 position ${movies.length + index + 1}`} className="relative aspect-[2/3] rounded-lg border border-dashed border-slate-700 bg-slate-950/50 sm:rounded-xl">
              <span className="absolute left-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-slate-600 bg-black/60 px-1 text-xs font-black text-slate-500 sm:left-2 sm:top-2 sm:h-8 sm:min-w-8 sm:text-sm">{movies.length + index + 1}</span>
            </li>
          )) : null}
        </ol>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-5 text-center">
          <p className="text-sm font-black text-white">{isOwnProfile ? "Your all-time favorites belong here." : "No all-time favorites selected yet."}</p>
          {isOwnProfile ? <button type="button" onClick={openEditor} className="mt-2 text-sm font-black text-yellow-300 hover:text-yellow-200">Choose your first movie</button> : null}
        </div>
      )}
      {dialog}
    </section>
  );
}
