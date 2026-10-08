import type { MovieSummary } from "./tmdb";

type SearchPage = { results?: MovieSummary[]; total_pages?: number };
function normalizedTitle(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function concurrentMap<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  }));
  return results;
}

export async function searchStreamingCatalog(
  query: string, providerIds: number[], genre: string, page: number,
  searchPage: (query: string, page: number) => Promise<SearchPage>,
  movieProviders: (movieId: number) => Promise<number[]>,
) {
  const first = await searchPage(query, 1);
  const availablePages = first.total_pages ?? 1;
  const pages = Math.min(availablePages, 50);

  const rest = await concurrentMap(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2), 8,
    number => searchPage(query, number));
  const terms = normalizedTitle(query).split(" ").filter(Boolean);
  const candidates = [...new Map([first, ...rest].flatMap(result => result.results ?? [])
    .filter(movie => !movie.adult && (!genre || movie.genre_ids?.includes(Number(genre))))
    .filter(movie => { const title = normalizedTitle(movie.title); return terms.every(term => title.includes(term)); })
    .map(movie => [movie.id, movie])).values()];
  const matches: MovieSummary[] = [];
  let failedChecks = 0;
  const verified = await concurrentMap(candidates, 20, async movie => {
    try {
      const ids = await movieProviders(movie.id);
      return ids.some(id => providerIds.includes(id)) ? movie : null;
    } catch {
      failedChecks++;
      return null;
    }
  });
  matches.push(...verified.filter((movie): movie is MovieSummary => movie !== null));
  if (candidates.length && failedChecks === candidates.length) throw new Error("Streaming availability unavailable.");
  matches.sort((a, b) => b.popularity - a.popularity || a.id - b.id);
  return { movies: matches.slice((page - 1) * 20, page * 20), totalPages: Math.ceil(matches.length / 20), searchLimited: availablePages > pages, availabilityIncomplete: failedChecks > 0 };
}
