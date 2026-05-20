import { NextResponse } from "next/server";
import { getMovies, type MovieSummary } from "@/lib/tmdb";

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsWholePhrase(normalizedTitle: string, normalizedQuery: string) {
  return ` ${normalizedTitle} `.includes(` ${normalizedQuery} `);
}

function suggestionScore(movie: MovieSummary, normalizedQuery: string) {
  const normalizedTitle = normalizeSearchText(movie.title);
  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  const titleTerms = normalizedTitle.split(" ").filter(Boolean);
  const isSingleTermQuery = queryTerms.length === 1;

  if (!normalizedTitle || queryTerms.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (normalizedTitle === normalizedQuery) {
    return 0;
  }

  if (normalizedTitle.startsWith(normalizedQuery)) {
    return isSingleTermQuery ? 0 : 1;
  }

  if (containsWholePhrase(normalizedTitle, normalizedQuery)) {
    return 2;
  }

  if (queryTerms.every((term) => titleTerms.includes(term))) {
    return 3;
  }

  if (
    queryTerms.every((term) =>
      titleTerms.some((word) => word.startsWith(term))
    )
  ) {
    return 4;
  }

  if (queryTerms.every((term) => normalizedTitle.includes(term))) {
    return 5;
  }

  return Number.POSITIVE_INFINITY;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const genre = searchParams.get("genre") ?? "";

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const normalizedQuery = normalizeSearchText(query);
  const movies = await getMovies(query, 140, genre);
  const suggestions = movies
    .map((movie) => ({
      movie,
      score: suggestionScore(movie, normalizedQuery),
    }))
    .filter(({ score }) => Number.isFinite(score))
    .sort(
      (a, b) =>
        a.score - b.score ||
        (b.movie.popularity ?? 0) - (a.movie.popularity ?? 0)
    )
    .slice(0, 8)
    .map(({ movie }) => ({
      id: movie.id,
      releaseDate: movie.release_date,
      title: movie.title,
    }));

  return NextResponse.json({ suggestions });
}
