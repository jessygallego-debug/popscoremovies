import { NextResponse } from "next/server";
import { getMovies, type MovieSummary } from "@/lib/tmdb";

const tmdbGenresById: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
  10402: "Musical",
  878: "Sci-Fi",
  9648: "Mystery",
  10749: "Romance",
  10751: "Family",
  10752: "War",
};

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
      genreNames: (movie.genre_ids ?? [])
        .map((genreId) => tmdbGenresById[genreId])
        .filter(Boolean)
        .slice(0, 3),
      id: movie.id,
      posterPath: movie.poster_path,
      releaseDate: movie.release_date,
      title: movie.title,
    }));

  return NextResponse.json({ suggestions });
}
