import { NextRequest, NextResponse } from "next/server";
import { getMovie, getMovieImageFallbacks } from "@/lib/tmdb";

const posterCacheHeaders = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request: NextRequest) {
  const movieId = request.nextUrl.searchParams.get("movie");

  if (!movieId) {
    return NextResponse.json(
      { posterPath: null },
      { headers: posterCacheHeaders }
    );
  }

  const movie = await getMovie(movieId);
  const imageFallbacks =
    movie && (!movie.poster_path || !movie.backdrop_path)
      ? await getMovieImageFallbacks(movieId)
      : null;

  return NextResponse.json(
    {
      backdropPath: movie?.backdrop_path ?? imageFallbacks?.backdropPath ?? null,
      posterPath: movie?.poster_path ?? imageFallbacks?.posterPath ?? null,
    },
    { headers: posterCacheHeaders }
  );
}
