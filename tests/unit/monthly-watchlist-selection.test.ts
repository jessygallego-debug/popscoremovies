import { test } from "node:test";
import assert from "node:assert/strict";
import type { MonthlyWatchlistMovie } from "../../lib/monthly-watchlist-email";
const { selectMonthlyPicks, assertCompleteMonthlyPicks, monthlyPopularityScore } =
  await import("../../lib/" + "monthly-watchlist-selection.ts") as typeof import("../../lib/monthly-watchlist-selection");

function movie(id: string, score: number, provider: string | null = null): MonthlyWatchlistMovie {
  return { movieId: id, movieTitle: id, rankingScore: score, provider,
    category: provider ? "subscription_streaming" : "digital",
    availabilityType: provider ? "subscription" : "rent_buy",
    displayOrder: 0, posterPath: "/poster.jpg", releaseDate: "2026-10-06",
    sourceUrl: "https://example.com/release", verifiedAt: "2026-10-05T00:00:00Z" };
}

test("popular streaming picks include alternatives to a dominant provider", () => {
  const selected = selectMonthlyPicks([
    movie("n1", 100, "Netflix"), movie("n2", 90, "Netflix"),
    movie("n3", 80, "Netflix"), movie("n4", 70, "Netflix"),
    movie("disclosure", 60, "Peacock"), movie("apple", 50, "Apple TV+"),
  ]);
  assert.deepEqual(selected.map(m => m.movieId), ["n1", "n2", "disclosure", "apple"]);
});

test("fills four streaming slots when alternatives cannot satisfy the provider cap", () => {
  const selected = selectMonthlyPicks([movie("1", 100, "Netflix"), movie("2", 90, "Netflix"),
    movie("3", 80, "Netflix"), movie("4", 70, "Netflix"), movie("5", 60, "Peacock")]);
  assert.deepEqual(selected.map(m => m.movieId), ["1", "2", "3", "5"]);
});

test("four digital picks are ranked by popularity and late feed entries remain eligible", () => {
  const candidates = Array.from({ length: 45 }, (_, i) => movie(String(i), i));
  candidates.push(movie("spider-man", 1000));
  assert.deepEqual(selectMonthlyPicks(candidates).map(m => m.movieId), ["spider-man", "44", "43", "42"]);
});

test("separate digital and subscription arrivals can feature the same movie", () => {
  const selected = selectMonthlyPicks([movie("same", 100), movie("same", 100, "Peacock")]);
  assert.equal(selected.length, 2);
});

test("incomplete or duplicate sections cannot be finalized", () => {
  const digital = [1,2,3,4].map(i => movie(`d${i}`, i));
  const streaming = [1,2,3,4].map(i => movie(`s${i}`, i, "Peacock"));
  assert.doesNotThrow(() => assertCompleteMonthlyPicks([...digital, ...streaming]));
  assert.throws(() => assertCompleteMonthlyPicks([...digital.slice(0,2), ...streaming]), /four verified digital.*found 2/);
  assert.throws(() => assertCompleteMonthlyPicks([...digital, ...streaming.slice(0,3), streaming[0]]), /four verified streaming.*found 3/);
});

test("invalid popularity cannot distort rankings", () => {
  for (const value of [undefined, NaN, Infinity, -5]) assert.equal(monthlyPopularityScore(value), 0);
  assert.equal(monthlyPopularityScore(120), 120);
});
