"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatReleaseMonthYear } from "@/lib/tmdb";
import { movieHref } from "@/lib/urls";

type MovieSuggestion = {
  id: number;
  releaseDate: string;
  title: string;
};

type MovieSearchProps = {
  compact?: boolean;
  genreId?: string;
  initialQuery: string;
};

export default function MovieSearch({ compact = false, genreId, initialQuery }: MovieSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [collections, setCollections] = useState<Array<{ id: number; name: string }>>([]);
  const [isFocused, setIsFocused] = useState(false);

  const showSuggestions =
    isFocused && query.trim().length >= 2 && (suggestions.length > 0 || collections.length > 0);
  const hasQuery = query.length > 0;

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setCollections([]);
    setIsFocused(true);
  };

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams({ query: trimmedQuery });

      if (genreId) {
        params.set("genre", genreId);
      }

      fetch(`/api/search-suggestions?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((data: { suggestions?: MovieSuggestion[]; collections?: Array<{ id: number; name: string }> }) => {
          if (controller.signal.aborted) return;
          setSuggestions(data.suggestions ?? []);
          setCollections(data.collections ?? []);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
            setCollections([]);
          }
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [genreId, query]);

  return (
    <form
      className={compact ? "relative z-[1200] hidden min-w-0 max-w-md flex-1 xl:block" : "relative z-[1200] flex max-w-4xl flex-col gap-2 sm:flex-row sm:gap-3"}
      action="/"
      role="search"
      onFocus={() => setIsFocused(true)}
      onBlur={(event) => {
        const form = event.currentTarget;
        if (form.contains(event.relatedTarget as Node | null)) return;
        // Allow touch selection before hiding; keyboard focus inside the form keeps it open.
        window.setTimeout(() => {
          if (!form.contains(document.activeElement)) setIsFocused(false);
        }, 120);
      }}
    >
      {genreId ? <input type="hidden" name="genre" value={genreId} /> : null}

      <div className="relative w-full">
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          name="query"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setSuggestions([]); setCollections([]); }}
          onFocus={() => setIsFocused(true)}
          placeholder="Search for a movie..."
          aria-label="Search movies and collections"
          className={`${compact ? "!min-h-11 !rounded-full !text-sm" : ""} min-h-12 w-full rounded-2xl border border-slate-700/90 bg-slate-950/80 px-4 pr-12 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_45px_rgba(0,0,0,0.35)] outline-none backdrop-blur transition placeholder:text-slate-500 focus:border-yellow-400/80 focus:bg-slate-950 focus:shadow-yellow-400/15 sm:min-h-16 sm:px-5 sm:pr-12 sm:text-base`}
        />

        {hasQuery ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-sm font-black text-slate-300 transition hover:border-yellow-400/60 hover:bg-yellow-400/10 hover:text-yellow-300"
          >
            X
          </button>
        ) : null}

        {showSuggestions ? (
          <div className="absolute left-0 right-0 top-full z-[1300] mt-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black">
            {collections.map(collection => (
              <Link
                key={`collection-${collection.id}`}
                href={`/?collection=${collection.id}#trending`}
                onClick={() => setIsFocused(false)}
                className="flex items-center justify-between gap-3 border-b border-gray-900 px-5 py-3 text-sm font-bold text-yellow-300 hover:bg-yellow-400 hover:text-black focus:bg-yellow-400 focus:text-black"
              >
                <span>{collection.name}</span>
                <span aria-hidden="true" className="shrink-0 text-xs font-normal">Collection</span>
              </Link>
            ))}
            {suggestions.map((movie) => {
              const releaseDate = movie.releaseDate
                ? formatReleaseMonthYear(movie.releaseDate)
                : "";

              return (
                <Link
                  key={movie.id}
                  data-remember-scroll
                  href={movieHref(movie)}
                  className="block border-b border-gray-900 px-5 py-3 text-sm font-bold text-white last:border-b-0 hover:bg-yellow-400 hover:text-black"
                >
                  {movie.title}{" "}
                  {releaseDate ? (
                    <span className="ml-2 font-normal text-gray-400">
                      {releaseDate}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      {!compact ? <button
        type="submit"
        className="min-h-12 rounded-2xl bg-yellow-400 px-7 text-sm font-black text-black shadow-[0_16px_34px_rgba(250,204,21,0.25)] transition hover:bg-yellow-300 hover:shadow-yellow-400/40 active:scale-[0.98] sm:min-h-16 sm:px-9 sm:text-base"
      >
        Search
      </button> : null}
    </form>
  );
}
