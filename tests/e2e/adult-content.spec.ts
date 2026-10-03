import { expect, test } from "@playwright/test";
import { getMovie, getMovieCollection, getMovies, getRecommendationMovies, searchMovieCollections } from "../../lib/tmdb";

test("adult titles are excluded from catalog, direct details, and collections", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.TMDB_API_TOKEN;
  process.env.TMDB_API_TOKEN = "test";
  const safe = { id: 1, adult: false, title: "Example", release_date: "2026-01-01", poster_path: "/test.jpg", backdrop_path: "/test.jpg", genre_ids: [28], popularity: 100 };
  const adult = { ...safe, id: 2, adult: true };
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname.includes("/collection/1400726")) throw new Error("Known blocked collections must not be fetched");
    if (url.pathname.endsWith("/search/collection")) return Response.json({ results: [{ id: 1400726, adult: false, name: "Reported collection" }, { id: 10, name: "Mixed Collection" }, { id: 11, name: "Blocked Collection" }] });
    if (url.pathname.endsWith("/collection/10")) return Response.json({ id: 10, name: "Mixed Collection", parts: [adult, safe, { ...safe, id: 3, adult: undefined }, { ...safe, id: 4, adult: undefined }, { ...safe, id: 5, adult: undefined }] });
    if (url.pathname.endsWith("/collection/11")) return Response.json({ id: 11, name: "Blocked Collection", parts: [adult] });
    if (/\/movie\/[234]$/.test(url.pathname)) return Response.json(adult);
    if (url.pathname.endsWith("/movie/5")) return Response.json({}, { status: 404 });
    if (url.pathname.endsWith("/movie/1")) return Response.json(safe);
    return Response.json({ results: [adult, safe], total_pages: 1 });
  };
  try {
    expect((await getMovies("Example", 20)).map(movie => movie.id)).toEqual([1]);
    expect((await getMovies("", 20)).map(movie => movie.id)).toEqual([1]);
    expect((await getRecommendationMovies("28", 20)).map(movie => movie.id)).toEqual([1]);
    expect(await getMovie("2")).toBeNull();
    expect((await getMovie("1"))?.id).toBe(1);
    expect((await getMovieCollection("10"))?.parts.map(movie => movie.id)).toEqual([1]);
    expect(await getMovieCollection("11")).toBeNull();
    expect(await getMovieCollection("1400726")).toBeNull();
    expect((await searchMovieCollections("Example")).map(collection => collection.id)).toEqual([10]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.TMDB_API_TOKEN;
    else process.env.TMDB_API_TOKEN = originalToken;
  }
});
