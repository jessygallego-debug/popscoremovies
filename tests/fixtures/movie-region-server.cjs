const realFetch = globalThis.fetch;
const movie = { adult: false, id: 123456, title: "Regional Movie", release_date: "2026-09-01", poster_path: "/poster.jpg", backdrop_path: "/backdrop.jpg", genre_ids: [18], popularity: 100, overview: "A regional fixture", runtime: 95, genres: [{ id: 18, name: "Drama" }], credits: { cast: [], crew: [] } };
globalThis.fetch = async (input, options) => {
  const url = new URL(typeof input === "string" ? input : input.url || String(input));
  if (url.hostname === "api.themoviedb.org") {
    if (url.pathname.endsWith("/watch/providers")) return Response.json({ results: {
      US: { buy: [{ provider_id: 10, provider_name: "US Store", logo_path: null }] },
      JP: { buy: [{ provider_id: 11, provider_name: "Japan Store", logo_path: null }] },
    } });
    if (/\/movie\/\d+$/.test(url.pathname)) return Response.json(movie);
    if (url.pathname.endsWith("/discover/movie")) {
      if (url.searchParams.has("release_date.gte")) {
        if (url.searchParams.get("sort_by") !== "popularity.desc" || !url.searchParams.get("with_release_type")) throw new Error("Regional discovery lost popularity sorting or release filtering");
        return Response.json({ results: [{ ...movie, title: `Movies released in ${url.searchParams.get("region")}` }], total_pages: 1 });
      }
    }
    return Response.json({ results: [movie], total_pages: 1 });
  }
  if (url.hostname === "example.supabase.co") return Response.json([]);
  return realFetch(input, options);
};
