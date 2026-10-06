import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const { collectMovieReleases } = require("../lib/releases/collector.ts");
process.env.TMDB_API_TOKEN = "mock";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock";
process.env.SUPABASE_URL = "https://mock.supabase.co";
const writes = [];
const json = (value) =>
  new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
global.fetch = async (input, init = {}) => {
  const url = String(input),
    body = init.body ? JSON.parse(init.body) : null;
  if (url.includes("rpc/claim_release_collection")) return json("run");
  if (url.includes("streaming_providers"))
    return json([
      {
        provider_id: "peacock",
        provider_name: "Peacock",
        tmdb_provider_ids: [386],
        enabled: true,
      },
      {
        provider_id: "netflix",
        provider_name: "Netflix",
        tmdb_provider_ids: [8],
        enabled: true,
      },
    ]);
  if (url.includes("release_sources"))
    return json([
      { source_id: "tmdb", name: "TMDB", kind: "tmdb", enabled: true },
      {
        source_id: "tmdb_availability",
        name: "Availability",
        kind: "detection",
        enabled: true,
      },
      {
        source_id: "broken",
        name: "Broken source",
        kind: "structured",
        enabled: true,
        endpoint: "https://broken.example/feed",
      },
    ]);
  if (url.includes("broken.example")) throw new Error("Source outage");
  if (url.includes("discover/movie"))
    return json({ results: [{ id: 1 }, { id: 2 }], total_pages: 1 });
  if (url.includes("api.themoviedb.org/3/movie/2"))
    throw new Error("Movie outage");
  if (url.includes("api.themoviedb.org/3/movie/1"))
    return json({
      id: 1,
      adult: false,
      title: "Major film",
      poster_path: "/poster",
      popularity: 100,
      vote_count: 1000,
      vote_average: 7,
      revenue: 100000000,
      overview: "Film",
      belongs_to_collection: null,
      release_dates: {
        results: [
          {
            iso_3166_1: "US",
            release_dates: [
              { type: 3, release_date: "2026-07-01" },
              { type: 4, release_date: "2026-10-06", note: "" },
              { type: 4, release_date: "2026-10-09", note: "Peacock" },
            ],
          },
        ],
      },
      "watch/providers": {
        results: {
          US: {
            flatrate: [{ provider_id: 386 }],
            rent: [{ provider_id: 8 }],
            buy: [],
          },
        },
      },
    });
  if ((init.method ?? "GET") === "GET") {
    if (url.includes("movie_provider_snapshots"))
      return json([{ flatrate: [] }]);
    if (
      url.includes("movie_release_events") &&
      url.includes("source_id=eq.tmdb")
    )
      return json([{ id: "old", source_event_key: "1:digital::2026-10-08" }]);
    return json([]);
  }
  writes.push({ url, body });
  return new Response(null, { status: 204 });
};
const report = await collectMovieReleases({
  start: "2026-10-01",
  end: "2026-11-30",
});
assert.equal(report.counts.digital, 1);
assert.equal(report.counts.streaming, 1);
assert.equal(report.counts.detections, 1);
assert.ok(report.errors.some((e) => e.includes("Movie 2")));
assert.ok(report.errors.some((e) => e.includes("Broken source")));
const events = writes
  .filter(
    (w) => w.url.includes("movie_release_events") && Array.isArray(w.body),
  )
  .flatMap((w) => w.body);
assert.ok(
  events.some(
    (e) =>
      e.release_type === "digital" && e.announced_release_date === "2026-10-06",
  ),
);
assert.ok(
  events.some(
    (e) =>
      e.provider_id === "peacock" && e.announced_release_date === "2026-10-09",
  ),
);
assert.ok(!events.some((e) => e.provider_id === "netflix")); // Rent-only never becomes subscription.
assert.ok(
  events.some((e) => e.detected_available_date && !e.announced_release_date),
);
assert.ok(
  writes.some(
    (w) => w.url.endsWith("id=eq.old") && w.body.status === "superseded",
  ),
);
assert.ok(
  writes.some(
    (w) =>
      w.url.includes("release_collection_runs") && w.body.status === "partial",
  ),
);
console.log(
  "Collector: source/movie isolation, digital/streaming separation, rent exclusion, detected-date separation, and delay supersession passed.",
);
