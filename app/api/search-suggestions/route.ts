import { NextResponse } from "next/server";
import {
  movieTitleSearchScore,
  normalizeMovieSearchText,
} from "@/lib/movie-search";
import { getMovies, type MovieSummary } from "@/lib/tmdb";

const tmdbGenresById: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  37: "Western",
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

function suggestionScore(movie: MovieSummary, normalizedQuery: string) {
  return movieTitleSearchScore(movie.title, normalizedQuery);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const genre = searchParams.get("genre") ?? "";

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const normalizedQuery = normalizeMovieSearchText(query);
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
