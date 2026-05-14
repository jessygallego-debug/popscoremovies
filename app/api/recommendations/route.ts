import { NextRequest, NextResponse } from "next/server";
import { genreTmdbIdForKey } from "@/lib/profile-config";
import { getMovies } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const genre = request.nextUrl.searchParams.get("genre") ?? "";
  const tmdbGenreId = genreTmdbIdForKey(genre);

  if (!tmdbGenreId) {
    return NextResponse.json({ movies: [] });
  }

  const movies = await getMovies("", 40, tmdbGenreId);

  return NextResponse.json({
    movies: movies.slice(0, 10),
  });
}
