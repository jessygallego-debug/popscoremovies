import { searchStreamingCatalog } from "@/lib/streaming-search";
import { groupStreamingProviders } from "@/lib/streaming-providers";
import { getStreamingMovies, getStreamingProviders, getStreamingSearchPage, getStreamingSubscriptionIds, MOVIE_GENRE_FILTERS } from "@/lib/tmdb";
import { MOVIE_REGION_OPTIONS } from "@/lib/movie-locale";

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams;
  const region = input.get("country") ?? "US";
  if (!MOVIE_REGION_OPTIONS.some(option => option.value === region && region)) {
    return Response.json({ error: "Choose a supported country." }, { status: 400 });
  }
  try {
    const providers = await getStreamingProviders(region);
    if (input.get("mode") === "providers") return Response.json({ providers: groupStreamingProviders(providers) });
    const ids = [...new Set((input.get("services") ?? "").split(",").filter(Boolean))];
    if (!ids.length || ids.length > 50 || ids.some(id => !providers.some(p => String(p.provider_id) === id))) {
      return Response.json({ error: "Choose valid streaming services for this country." }, { status: 400 });
    }
    const genre = input.get("genre") ?? "";
    const query = (input.get("query") ?? "").trim();
    const page = input.get("page") ?? "1";
    if ((genre && !MOVIE_GENRE_FILTERS.some(g => g.id === genre && /^\d+$/.test(g.id))) ||
      (query && (query.length < 2 || query.length > 100)) ||
      !/^\d+$/.test(page) || Number(page) < 1 || Number(page) > 500) {
      return Response.json({ error: "Invalid movie filters." }, { status: 400 });
    }
    const groups = groupStreamingProviders(providers);
    const expandedIds = [...new Set(groups.filter(group => group.provider_ids?.some(id => ids.includes(String(id)))).flatMap(group => group.provider_ids ?? [group.provider_id]))];
    if (query) {
      try {
        return Response.json(await searchStreamingCatalog(query, expandedIds, genre, Number(page), getStreamingSearchPage, id => getStreamingSubscriptionIds(id, region)));
      } catch (error) {
        if (error instanceof Error && error.message === "Please use a more specific movie title.") return Response.json({ error: error.message }, { status: 422 });
        throw error;
      }
    }
    const params = new URLSearchParams({ watch_region: region, with_watch_providers: expandedIds.join("|"),
      with_watch_monetization_types: "flatrate", include_adult: "false", sort_by: "popularity.desc", language: "en-US", page });
    if (genre) params.set("with_genres", genre);

    const result = await getStreamingMovies(params);
    const availability = await Promise.all(result.movies.map(async movie => ({
      movie, providers: await getStreamingSubscriptionIds(movie.id, region),
    })));
    return Response.json({
      ...result,
      movies: availability.filter(item => item.providers.some(id => expandedIds.includes(id))).map(item => item.movie),
    });
  } catch {
    return Response.json({ error: "Streaming availability is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
