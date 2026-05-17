import { NextRequest, NextResponse } from "next/server";
import { getMovie, getMovieImageFallbacks } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const movieId = request.nextUrl.searchParams.get("movie");

  if (!movieId) {
    return NextResponse.json({ posterPath: null });
  }

  const movie = await getMovie(movieId);
  const imageFallbacks =
    movie && (!movie.poster_path || !movie.backdrop_path)
      ? await getMovieImageFallbacks(movieId)
      : null;

  return NextResponse.json({
    backdropPath: movie?.backdrop_path ?? imageFallbacks?.backdropPath ?? null,
    posterPath: movie?.poster_path ?? imageFallbacks?.posterPath ?? null,
  });
}
