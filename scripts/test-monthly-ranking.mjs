import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => module._compile(
  ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename,
);
const { releaseCandidateReport } = require("../lib/releases/candidates.ts");
const { relevanceScore } = require("../lib/releases/policy.ts");
process.env.SUPABASE_URL = "https://fixture.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
const monthKey = `${new Date().toISOString().slice(0, 7)}-01`;
const movies = [
  { tmdb_id: 1, title: "Popular", popularity: 500, vote_count: 100, metadata: { revenue: 5000000 } },
  { tmdb_id: 2, title: "More votes", popularity: 50, vote_count: 1000, metadata: { revenue: 50000000 } },
  { tmdb_id: 3, title: "Approved", popularity: 10, vote_count: 10, metadata: {} },
].map(movie => ({ ...movie, poster_path: "/poster", vote_average: 7 }));
const events = movies.map(movie => ({
  id: `event-${movie.tmdb_id}`, tmdb_id: movie.tmdb_id, release_type: "digital",
  provider_id: null, announced_release_date: monthKey, source_id: "studio",
  source_url: "https://fixture.invalid/announcement", confidence: "HIGH",
  verified_at: new Date().toISOString(), status: "active",
}));
globalThis.fetch = async input => {
  const url = new URL(String(input));
  const table = url.pathname.split("/").at(-1);
  const fixtures = {
    movie_release_events: events,
    release_sources: [{ source_id: "studio", kind: "official", independent_family: "studio", name: "Studio" }],
    release_movie_metadata: movies,
    streaming_providers: [],
    monthly_release_overrides: [{ event_id: "event-3", action: "approve" }],
  };
  assert.ok(table in fixtures, `Unexpected request: ${table}`);
  return new Response(JSON.stringify(fixtures[table]), { status: 200 });
};
const report = await releaseCandidateReport(monthKey);
assert.deepEqual(report.selected.map(movie => movie.movieId), ["1", "2", "3"]);
for (const selected of report.selected)
  assert.equal(selected.rankingScore, relevanceScore(movies.find(movie => String(movie.tmdb_id) === selected.movieId)));
assert.equal(report.selected[2].approved, true);
console.log("Monthly ranking: popularity-led selection and no admin-approval bonus passed.");
