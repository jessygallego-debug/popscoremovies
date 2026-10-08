import assert from "node:assert/strict";
import { test } from "node:test";
import { searchStreamingCatalog } from "../../lib/streaming-search.ts";
const movie = (id, popularity, genres = [28]) => ({ id, title: "Batman " + id, popularity, genre_ids: genres, adult: false });

test("catalog search includes later search pages, filters subscriptions and genre, and sorts by popularity", async () => {
 const result = await searchStreamingCatalog("Batman", [1, 2], "28", 1,
  async (_, page) => ({ total_pages: 2, results: page === 1 ? [movie(1, 5), movie(2, 80), movie(3, 90, [35])] : [movie(4, 100), movie(1, 5)] }),
  async id => id === 2 ? [9] : [2]);
 assert.deepEqual(result.movies.map(movie => movie.id), [4, 1]);
 assert.equal(result.totalPages, 1);
});

test("catalog search paginates matched titles", async () => {
 const result = await searchStreamingCatalog("Batman", [1], "", 2,
  async () => ({ total_pages: 1, results: Array.from({ length: 25 }, (_, i) => movie(i + 1, 25 - i)) }),
  async () => [1]);
 assert.equal(result.movies.length, 5);
 assert.equal(result.movies[0].id, 21);
 assert.equal(result.totalPages, 2);

});


test("broad partial-title searches find subscription titles beyond the old limit", async () => {
 const result = await searchStreamingCatalog("demon", [350], "", 1,
  async (_, page) => ({ total_pages: 14, results: page === 12 ? [{ ...movie(100, 99), title: "Demon Slayer" }] : [] }),
  async () => [350]);
 assert.equal(result.movies[0].title, "Demon Slayer");
 assert.equal(result.searchLimited, false);
});

test("extremely broad queries return available matches and flag the search limit", async () => {
 const result = await searchStreamingCatalog("Batman", [1], "", 1,
  async (_, page) => ({ total_pages: 500, results: page === 1 ? [movie(1, 100)] : [] }), async () => [1]);
 assert.equal(result.movies.length, 1);
 assert.equal(result.searchLimited, true);
});

test("multiple services use OR matching and a failed movie lookup does not discard verified matches", async () => {
 const result = await searchStreamingCatalog("demon", [8, 9], "", 1,
  async () => ({ total_pages: 1, results: [movie(1, 100), movie(2, 90), movie(3, 80), movie(4, 70)].map(movie => ({ ...movie, title: "Demon " + movie.id })) }),
  async id => { if (id === 3) throw new Error("Upstream unavailable"); return id === 1 ? [8] : id === 2 ? [9] : [350]; });
 assert.deepEqual(result.movies.map(movie => movie.id), [1, 2]);
 assert.equal(result.availabilityIncomplete, true);
});

test("a total availability outage remains an error rather than false empty results", async () => {
 await assert.rejects(searchStreamingCatalog("demon", [8, 9], "", 1,
  async () => ({ results: [{ ...movie(1, 100), title: "Demon" }] }),
  async () => { throw new Error("Unavailable"); }), /availability unavailable/);
});


test("unrelated fuzzy results do not trigger expensive availability lookups", async () => {
 const checked = [];
 const result = await searchStreamingCatalog("demon", [8, 9], "", 1,
  async () => ({ results: [{ ...movie(1, 10), title: "Demon Slayer" }, { ...movie(2, 20), title: "Unrelated Movie" }] }),
  async id => { checked.push(id); return [9]; });
 assert.deepEqual(checked, [1]);
 assert.equal(result.movies[0].title, "Demon Slayer");
});

test("availability workers start the next lookup without waiting for a slow batch", async () => {
 let release;
 const slow = new Promise(resolve => { release = resolve; });
 let checkedLater = false;
 await searchStreamingCatalog("Batman", [8], "", 1,
  async () => ({ results: Array.from({ length: 25 }, (_, i) => movie(i + 1, i)) }),
  async id => {
   if (id === 1) await slow;
   if (id === 21) { checkedLater = true; release(); }
   return [8];
  });
 assert.equal(checkedLater, true);
});
