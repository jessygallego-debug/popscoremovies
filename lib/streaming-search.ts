import type { MovieSummary } from "./tmdb";

type SearchPage = { results?: MovieSummary[]; total_pages?: number };
export async function searchStreamingCatalog(
  query: string, providerIds: number[], genre: string, page: number,
  searchPage: (query: string, page: number) => Promise<SearchPage>,
  movieProviders: (movieId: number) => Promise<number[]>,
) {
  const first = await searchPage(query, 1);
  const availablePages = first.total_pages ?? 1;
  const pages = Math.min(availablePages, 50);

  const rest: SearchPage[] = [];
  for (let start = 2; start <= pages; start += 5) {
    rest.push(...await Promise.all(Array.from({ length: Math.min(5, pages - start + 1) }, (_, i) => searchPage(query, start + i))));
  }
  const candidates = [...new Map([first, ...rest].flatMap(result => result.results ?? [])
    .filter(movie => !movie.adult && (!genre || movie.genre_ids?.includes(Number(genre))))
    .map(movie => [movie.id, movie])).values()];
  const matches: MovieSummary[] = [];
  let failedChecks = 0;
  for (let i = 0; i < candidates.length; i += 10) {
    const batch = await Promise.allSettled(candidates.slice(i, i + 10).map(async movie => {
      const ids = await movieProviders(movie.id);
      return ids.some(id => providerIds.includes(id)) ? movie : null;
    }));
    for (const result of batch) {
      if (result.status === "rejected") failedChecks++;
      else if (result.value) matches.push(result.value);
    }
  }
  if (candidates.length && failedChecks === candidates.length) throw new Error("Streaming availability unavailable.");
  matches.sort((a, b) => b.popularity - a.popularity || a.id - b.id);
  return { movies: matches.slice((page - 1) * 20, page * 20), totalPages: Math.ceil(matches.length / 20), searchLimited: availablePages > pages, availabilityIncomplete: failedChecks > 0 };
}
