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
 const result = await searchStreamingCatalog("Movie", [1], "", 2,
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
 const result = await searchStreamingCatalog("movie", [1], "", 1,
  async (_, page) => ({ total_pages: 500, results: page === 1 ? [movie(1, 100)] : [] }), async () => [1]);
 assert.equal(result.movies.length, 1);
 assert.equal(result.searchLimited, true);
});
