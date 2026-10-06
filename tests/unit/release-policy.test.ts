import { test } from "node:test";
import assert from "node:assert/strict";
import type { ReleaseEvidence, ReleaseMovie } from "../../lib/releases/policy";
const {
  earliestUsDigital,
  newSubscriptionProviders,
  relevanceScore,
  resolveReleaseEvidence,
  subscriptionNote,
  digitalConfidence,
} = (await import(
  "../../lib/releases/" + "policy.ts"
)) as typeof import("../../lib/releases/policy");
const now = new Date("2026-10-06T12:00:00Z");
const sources = [
  { source_id: "tmdb", name: "TMDB", kind: "tmdb", independent_family: "tmdb" },
  {
    source_id: "calendar",
    name: "Calendar",
    kind: "structured",
    independent_family: "tmdb",
  },
  {
    source_id: "studio",
    name: "Studio",
    kind: "official",
    independent_family: "studio",
  },
];
function event(overrides: Partial<ReleaseEvidence> = {}): ReleaseEvidence {
  return {
    id: "a",
    tmdb_id: 1,
    release_type: "subscription_streaming",
    provider_id: "peacock",
    announced_release_date: "2026-10-09",
    source_id: "tmdb",
    source_url: "https://example.com",
    confidence: "MEDIUM",
    verified_at: "2026-10-06T00:00:00Z",
    status: "active",
    ...overrides,
  };
}
test("digital uses only earliest US type 4; later rereleases do not qualify", () => {
  assert.equal(
    earliestUsDigital([
      {
        iso_3166_1: "GB",
        release_dates: [{ type: 4, release_date: "2026-01-01" }],
      },
      {
        iso_3166_1: "US",
        release_dates: [
          { type: 3, release_date: "2026-02-01" },
          { type: 5, release_date: "2026-03-01" },
          { type: 4, release_date: "2026-10-10" },
          { type: 4, release_date: "2026-09-01" },
        ],
      },
    ])?.release_date,
    "2026-09-01",
  );
});
test("first snapshot is a baseline and repeated availability is not a new arrival", () => {
  assert.deepEqual(newSubscriptionProviders(null, [8]), []);
  assert.deepEqual(newSubscriptionProviders([8], [8, 386]), [386]);
  assert.deepEqual(newSubscriptionProviders([], [386]), [386]);
});
test("availability-only evidence never yields announced releases", () =>
  assert.equal(
    resolveReleaseEvidence(
      [
        event({
          announced_release_date: null,
          detected_available_date: "2026-10-06",
        }),
      ],
      sources,
      now,
    ).length,
    0,
  ));
test("official changed date wins while retaining conflicting evidence", () => {
  const result = resolveReleaseEvidence(
    [
      event(),
      event({
        id: "b",
        source_id: "studio",
        announced_release_date: "2026-11-02",
      }),
    ],
    sources,
    now,
  )[0];
  assert.equal(result.announced_release_date, "2026-11-02");
  assert.equal(result.confidence, "HIGH");
  assert.equal(result.conflicting, true);
  assert.equal(result.evidence.length, 2);
});
test("TMDB-derived calendar does not count as independent confirmation", () =>
  assert.equal(
    resolveReleaseEvidence(
      [event(), event({ id: "b", source_id: "calendar" })],
      sources,
      now,
    )[0].confidence,
    "MEDIUM",
  ));
test("stale official dates and equal-priority conflicts are withheld", () => {
  assert.equal(
    resolveReleaseEvidence(
      [event({ source_id: "studio", verified_at: "2026-09-01T00:00:00Z" })],
      sources,
      now,
    )[0].confidence,
    "LOW",
  );
  assert.equal(
    resolveReleaseEvidence(
      [event(), event({ id: "b", announced_release_date: "2026-10-12" })],
      sources,
      now,
    )[0].confidence,
    "LOW",
  );
});
test("engagement outweighs a high average with few votes", () => {
  const movie: ReleaseMovie = {
    tmdb_id: 1,
    title: "Movie",
    poster_path: "/p",
    popularity: 20,
    vote_count: 30,
    vote_average: 9,
    metadata: {},
  };
  assert.ok(
    relevanceScore(
      { ...movie, vote_average: 7.5, vote_count: 50000 },
      "2026-10-06",
    ) > relevanceScore(movie, "2026-10-06"),
  );
});
test("subscription notes require explicit names; store names remain distinct", () => {
  assert.equal(subscriptionNote("Peacock"), "peacock");
  assert.equal(subscriptionNote("Apple TV+"), "apple");
  assert.equal(subscriptionNote("Apple TV"), null);
  assert.equal(subscriptionNote("possibly Netflix"), null);
  assert.equal(digitalConfidence("2006-10-20", "2026-11-06", "MUBI"), "LOW");
  assert.equal(digitalConfidence("2026-07-31", "2026-10-06", ""), "MEDIUM");
});
