import { readFileSync } from "node:fs";
import { assertCompleteMonthlyPicks, selectMonthlyPicks } from "../lib/monthly-watchlist-selection.ts";

// Input uses MonthlyWatchlistMovie fields, with rankingScore set to current
// TMDB popularity, and verified release dates from the month's candidate pool.
const [candidatePath, month] = process.argv.slice(2);
if (!candidatePath || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? "")) {
  throw new Error("Usage: node scripts/select-monthly-watchlist.mjs candidates.json YYYY-MM");
}
const candidates = JSON.parse(readFileSync(candidatePath, "utf8"));
if (!Array.isArray(candidates)) throw new Error("Expected an array of verified candidates.");
const now = Date.now();
for (const movie of candidates) {
  const date = new Date(`${movie.releaseDate}T00:00:00Z`);
  const verified = Date.parse(movie.verifiedAt);
  if (!/^\d+$/.test(movie.movieId) || !movie.movieTitle || !movie.posterPath ||
    !Number.isFinite(movie.rankingScore) || movie.rankingScore < 0 ||
    !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== movie.releaseDate ||
    !movie.releaseDate.startsWith(`${month}-`) ||
    !Number.isFinite(verified) || now - verified > 21 * 86400000 || verified - now > 300000 ||
    new URL(movie.sourceUrl).protocol !== "https:" ||
    !(movie.category === "digital" && movie.availabilityType === "rent_buy" && !movie.provider ||
      movie.category === "subscription_streaming" && movie.availabilityType === "subscription" && movie.provider?.trim())) {
    throw new Error(`Invalid or stale release candidate: ${movie.movieTitle ?? movie.movieId}`);
  }
}
const selected = selectMonthlyPicks(candidates);
assertCompleteMonthlyPicks(selected);
process.stdout.write(`${JSON.stringify(selected, null, 2)}\n`);
