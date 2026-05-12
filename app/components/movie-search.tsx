"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatReleaseMonthYear } from "@/lib/tmdb";

type MovieSuggestion = {
  id: number;
  releaseDate: string;
  title: string;
};

type MovieSearchProps = {
  genreId?: string;
  initialQuery: string;
};

function buildReturnTo(query: string, genreId?: string) {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    params.set("query", trimmedQuery);
  }

  if (genreId) {
    params.set("genre", genreId);
  }

  const queryString = params.toString();

  return queryString ? `/?${queryString}` : "/";
}

export default function MovieSearch({ genreId, initialQuery }: MovieSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  const returnTo = useMemo(() => buildReturnTo(query, genreId), [genreId, query]);
  const showSuggestions =
    isFocused && query.trim().length >= 2 && suggestions.length > 0;
  const hasQuery = query.length > 0;

  const clearSearch = () => {
    setQuery("");
    setSuggestions([]);
    setIsFocused(true);

    if (initialQuery.trim()) {
      router.push(buildReturnTo("", genreId));
    }
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
        .then((data: { suggestions?: MovieSuggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
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
      className="relative mb-8 flex max-w-3xl flex-col gap-3 sm:flex-row"
      action="/"
    >
      {genreId ? <input type="hidden" name="genre" value={genreId} /> : null}

      <div className="relative w-full">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lg text-slate-500"
        >
          🔎
        </span>
        <input
          type="search"
          name="query"
          value={query}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search for a movie..."
          className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-12 pl-12 text-base font-bold text-white shadow-lg shadow-black/30 outline-none transition placeholder:text-slate-500 focus:border-yellow-400 focus:shadow-yellow-400/10"
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
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black">
            {suggestions.map((movie) => {
              const releaseDate = movie.releaseDate
                ? formatReleaseMonthYear(movie.releaseDate)
                : "";

              return (
                <Link
                  key={movie.id}
                  data-remember-scroll
                  href={`/movie/${movie.id}?returnTo=${encodeURIComponent(
                    returnTo
                  )}`}
                  className="block border-b border-gray-900 px-5 py-3 text-sm font-bold text-white last:border-b-0 hover:bg-yellow-400 hover:text-black"
                >
                  {movie.title}
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

      <button
        type="submit"
        className="min-h-14 rounded-2xl bg-yellow-400 px-8 text-base font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 active:scale-[0.98]"
      >
        Search
      </button>
    </form>
  );
}
