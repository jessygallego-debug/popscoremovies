import { getStreamingMovies, getStreamingProviders, MOVIE_GENRE_FILTERS } from "@/lib/tmdb";
import { MOVIE_REGION_OPTIONS } from "@/lib/movie-locale";

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams;
  const region = input.get("country") ?? "US";
  if (!MOVIE_REGION_OPTIONS.some(option => option.value === region && region)) {
    return Response.json({ error: "Choose a supported country." }, { status: 400 });
  }
  try {
    const providers = await getStreamingProviders(region);
    if (input.get("mode") === "providers") return Response.json({ providers });
    const ids = [...new Set((input.get("services") ?? "").split(",").filter(Boolean))];
    if (!ids.length || ids.length > 50 || ids.some(id => !providers.some(p => String(p.provider_id) === id))) {
      return Response.json({ error: "Choose valid streaming services for this country." }, { status: 400 });
    }
    const genre = input.get("genre") ?? "";
    const year = input.get("year") ?? "";
    const page = input.get("page") ?? "1";
    if ((genre && !MOVIE_GENRE_FILTERS.some(g => g.id === genre && /^\d+$/.test(g.id))) ||
      (year && (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > new Date().getFullYear())) ||
      !/^\d+$/.test(page) || Number(page) < 1 || Number(page) > 500) {
      return Response.json({ error: "Invalid movie filters." }, { status: 400 });
    }
    const params = new URLSearchParams({ watch_region: region, with_watch_providers: ids.join("|"),
      with_watch_monetization_types: "flatrate", include_adult: "false", sort_by: "popularity.desc", language: "en-US", page });
    if (genre) params.set("with_genres", genre);
    if (year) params.set("primary_release_year", year);
    return Response.json(await getStreamingMovies(params));
  } catch {
    return Response.json({ error: "Streaming availability is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
