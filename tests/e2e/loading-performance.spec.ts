import { getMovies, getRecommendationMovies } from "../../lib/tmdb";
import { expect, test } from "@playwright/test";
import { getPopScore } from "../../lib/popscore-store";
import { createInFlightReadPool } from "../../lib/in-flight-read";

test("100 cards with duplicate score displays use six reads and stay fresh", async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test";
  let calls = 0;
  let answer = 4;
  globalThis.fetch = async input => {
    calls++;
    const url = new URL(String(input));
    const ids = url.searchParams.get("movie_id")!.slice(4, -1).split(",").map(id => JSON.parse(id));
    return Response.json(url.pathname.endsWith("/ratings") ? [] : ids.map(movie_id => ({
      id: movie_id, movie_id, ratings: { story: answer }, weights: [{ key: "story", weight: 1 }],
    })));
  };
  try {
    const results = await Promise.all(Array.from({ length: 200 }, (_, index) => getPopScore(String(index % 100))));
    expect(calls).toBe(6);
    expect(results.every(score => score?.score === 80 && score.count === 1)).toBe(true);
    answer = 5;
    expect(await getPopScore("1")).toEqual({ score: 100, count: 1 });
    expect(calls).toBe(8);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});

test("concurrent reads are scoped, failures retry, and mutations invalidate pending work", async () => {
  const pool = createInFlightReadPool();
  let resolve!: (value: number) => void;
  let calls = 0;
  const load = () => { calls++; return new Promise<number>(done => { resolve = done; }); };
  const first = pool("user-a", load);
  expect(pool("user-a", load)).toBe(first);
  expect(calls).toBe(1);
  expect(await pool("user-b", async () => 2)).toBe(2);
  pool.clear();
  expect(await pool("user-a", async () => 3)).toBe(3);
  resolve(1);
  expect(await first).toBe(1);
  await expect(pool("failure", async () => { throw Error("offline"); })).rejects.toThrow("offline");
  expect(await pool("failure", async () => 4)).toBe(4);
});

test("batched scores page through large result sets without mixing movies", async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test";
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/ratings")) return Response.json([]);
    const row = (movie_id: string, rating: number) => ({ id: movie_id, movie_id, ratings: { story: rating }, weights: [{ key: "story", weight: 1 }] });
    return Response.json(url.searchParams.get("offset") === "0" ? Array.from({ length: 1000 }, () => row("popular", 5)) : [row("other", 1)]);
  };
  try {
    expect(await Promise.all([getPopScore("popular"), getPopScore("other")])).toEqual([{ score: 100, count: 1000 }, { score: 0, count: 1 }]);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});

test("catalog and recommendations overlap pages with bounded concurrency and preserve results", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.TMDB_API_TOKEN;
  process.env.TMDB_API_TOKEN = "test";
  let concurrent = 0;
  let peak = 0;
  let calls = 0;
  globalThis.fetch = async input => {
    concurrent++;
    peak = Math.max(peak, concurrent);
    calls++;
    const page = Number(new URL(String(input)).searchParams.get("page"));
    await new Promise(resolve => setTimeout(resolve, 5));
    concurrent--;
    return Response.json({ total_pages: 5, results: Array.from({ length: 20 }, (_, index) => ({
      id: (page - 1) * 20 + index + 1, title: `Movie ${page}-${index}`, poster_path: "/poster.jpg", backdrop_path: "/backdrop.jpg", genre_ids: [18], release_date: "2026-01-01", popularity: 101 - ((page - 1) * 20 + index + 1),
    })) });
  };
  try {
    for (const load of [() => getMovies("", 100), () => getRecommendationMovies("", 100)]) {
      const result = await load();
      expect(result).toHaveLength(100);
      expect(new Set(result.map(movie => movie.id)).size).toBe(100);
      expect(result[0].id).toBe(1);
    }
    expect(calls).toBe(10);
    expect(peak).toBe(3);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.TMDB_API_TOKEN; else process.env.TMDB_API_TOKEN = originalToken;
  }
});
