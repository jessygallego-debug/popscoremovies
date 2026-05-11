"use client";

import Link from "next/link";
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
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  const returnTo = useMemo(() => buildReturnTo(query, genreId), [genreId, query]);
  const showSuggestions =
    isFocused && query.trim().length >= 2 && suggestions.length > 0;

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
    <form className="relative mb-6 flex flex-col gap-3 sm:flex-row" action="/">
      {genreId ? <input type="hidden" name="genre" value={genreId} /> : null}

      <div className="relative w-full">
        <input
          type="search"
          name="query"
          value={query}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search for a movie..."
          className="min-h-14 w-full rounded-lg border border-gray-700 bg-gray-950 px-5 text-white outline-none focus:border-yellow-400"
        />

        {showSuggestions ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-gray-800 bg-gray-950 shadow-2xl shadow-black">
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
        className="min-h-14 rounded-lg bg-yellow-400 px-6 font-bold text-black hover:bg-yellow-300"
      >
        Search
      </button>
    </form>
  );
}
