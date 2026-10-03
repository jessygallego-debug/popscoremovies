import { expect, test } from "@playwright/test";
import { getMovieCollection, searchMovieCollections } from "../../lib/tmdb";
import { GET } from "../../app/api/search-suggestions/route";

test("collection API combines suggestions and keeps all collection movies in release order", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.TMDB_API_TOKEN;
  process.env.TMDB_API_TOKEN = "test";
  const requests: string[] = [];
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    requests.push(url.pathname);
    if (url.pathname.endsWith("/search/collection")) return Response.json({ results: [{ id: 656, name: "Saw Collection", poster_path: null }] });
    if (url.pathname.endsWith("/collection/656")) return Response.json({ id: 656, name: "Saw Collection", parts: [
      { id: 3, title: "Future installment", release_date: "", poster_path: null },
      { id: 2, title: "Saw II", release_date: "2005-10-28", poster_path: null },
      { id: 1, title: "Saw", release_date: "2004-10-29", poster_path: "/saw.jpg" },
      { id: 1, title: "Saw", release_date: "2004-10-29", poster_path: "/saw.jpg" },
    ] });
    return Response.json({ results: [{ id: 1, title: "Saw", release_date: "2004-10-29", popularity: 100 }], total_pages: 1 });
  };
  try {
    const response = await GET(new Request("http://localhost/api/search-suggestions?query=Saw"));
    const data = await response.json();
    expect(data.collections[0].name).toBe("Saw Collection");
    expect(data.suggestions[0].title).toBe("Saw");
    const collection = await getMovieCollection("656");
    expect(collection?.parts.map(movie => movie.id)).toEqual([1, 2, 3]);
    const requestCount = requests.length;
    expect(await getMovieCollection("../secret")).toBeNull();
    expect(await searchMovieCollections("s")).toEqual([]);
    expect(requests).toHaveLength(requestCount);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.TMDB_API_TOKEN; else process.env.TMDB_API_TOKEN = originalToken;
  }
});

for (const width of [390, 1280]) {
  test(`existing movie search offers collections at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/search-suggestions?**", route => route.fulfill({ json: {
      suggestions: [{ id: 176, title: "Saw", releaseDate: "2004-10-29" }],
      collections: [{ id: 656, name: "Saw Collection" }],
    } }));
    await page.goto("/");
    const search = page.getByRole("textbox", { name: "Search movies and collections" });
    await search.fill("Saw");
    const collection = page.getByRole("link", { name: "Saw Collection", exact: true });
    await expect(collection).toBeVisible();
    await expect(collection).toHaveAttribute("href", "/?collection=656#trending");
    await expect(page.getByRole("link", { name: "Saw October 2004" })).toHaveAttribute("href", "/movies/saw-176");
    await search.press("Tab");
    await page.keyboard.press("Tab");
    await expect(collection).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/collection=656/);
    await expect(page.locator("#trending h2")).toContainText(/Collection/);
    await expect(page.getByRole("heading", { name: "Trending Movies", exact: true })).toHaveCount(0);
    if (process.env.PLAYWRIGHT_COLLECTION_FIXTURE) {
      await expect(page.locator("#trending h2")).toHaveText("Saw Collection");
      await expect(page.locator("#trending article")).toHaveCount(2);
      await expect(page.locator("#trending article").first().getByRole("link", { name: "Rate Saw", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Rate Saw II", exact: true })).toBeVisible();
      await page.locator("#trending").screenshot({ path: `artifacts/collection-results-${width}.png` });
      await page.locator('#trending article a[href*="/movies/saw-176"]').click();
      await page.getByRole("link", { name: "Close movie details" }).click();
      await expect(page).toHaveURL(/collection=656/);
      await expect(page.locator("#trending h2")).toHaveText("Saw Collection");
    }
  });
}
