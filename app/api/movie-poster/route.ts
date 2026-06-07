import { NextRequest, NextResponse } from "next/server";
import { getMovie, getMovieImageFallbacks, tmdbImagePath } from "@/lib/tmdb";

const posterCacheHeaders = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request: NextRequest) {
  const movieId = request.nextUrl.searchParams.get("movie");
  const failedPath = tmdbImagePath(request.nextUrl.searchParams.get("failed"));

  if (!movieId) {
    return NextResponse.json(
      { posterPath: null },
      { headers: posterCacheHeaders }
    );
  }

  const movie = await getMovie(movieId);
  const imageFallbacks = movie
    ? await getMovieImageFallbacks(movieId, [failedPath])
    : null;
  const moviePosterPath = tmdbImagePath(movie?.poster_path);
  const movieBackdropPath = tmdbImagePath(movie?.backdrop_path);
  const posterPath =
    imageFallbacks?.posterPath ??
    (moviePosterPath && moviePosterPath !== failedPath ? moviePosterPath : null);
  const backdropPath =
    imageFallbacks?.backdropPath ??
    (movieBackdropPath && movieBackdropPath !== failedPath
      ? movieBackdropPath
      : null);

  return NextResponse.json(
    {
      backdropPath,
      posterPath,
    },
    { headers: posterCacheHeaders }
  );
}
