import { NextRequest, NextResponse } from "next/server";
import { getMovie } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const movieId = request.nextUrl.searchParams.get("movie");

  if (!movieId) {
    return NextResponse.json({ posterPath: null });
  }

  const movie = await getMovie(movieId);

  return NextResponse.json({
    posterPath: movie?.poster_path ?? null,
  });
}
