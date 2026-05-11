import { NextResponse } from "next/server";
import { getMovies } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const genre = searchParams.get("genre") ?? "";

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const normalizedQuery = query.toLowerCase();
  const movies = await getMovies(query, 80, genre);
  const suggestions = movies
    .filter((movie) => movie.title.toLowerCase().startsWith(normalizedQuery))
    .slice(0, 8)
    .map((movie) => ({
      id: movie.id,
      releaseDate: movie.release_date,
      title: movie.title,
    }));

  return NextResponse.json({ suggestions });
}
