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

test("catalog search paginates matched titles and rejects queries too broad to complete", async () => {
 const result = await searchStreamingCatalog("Movie", [1], "", 2,
  async () => ({ total_pages: 1, results: Array.from({ length: 25 }, (_, i) => movie(i + 1, 25 - i)) }),
  async () => [1]);
 assert.equal(result.movies.length, 5);
 assert.equal(result.movies[0].id, 21);
 assert.equal(result.totalPages, 2);
 await assert.rejects(searchStreamingCatalog("a", [1], "", 1, async () => ({ total_pages: 11 }), async () => [1]), /more specific/);
});
