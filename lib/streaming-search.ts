import type { MovieSummary } from "./tmdb";

type SearchPage = { results?: MovieSummary[]; total_pages?: number };
export async function searchStreamingCatalog(
  query: string, providerIds: number[], genre: string, page: number,
  searchPage: (query: string, page: number) => Promise<SearchPage>,
  movieProviders: (movieId: number) => Promise<number[]>,
) {
  const first = await searchPage(query, 1);
  const pages = first.total_pages ?? 1;
  if (pages > 10) throw new Error("Please use a more specific movie title.");
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => searchPage(query, i + 2)));
  const candidates = [...new Map([first, ...rest].flatMap(result => result.results ?? [])
    .filter(movie => !movie.adult && (!genre || movie.genre_ids?.includes(Number(genre))))
    .map(movie => [movie.id, movie])).values()];
  const matches: MovieSummary[] = [];
  for (let i = 0; i < candidates.length; i += 10) {
    const batch = await Promise.all(candidates.slice(i, i + 10).map(async movie => {
      const ids = await movieProviders(movie.id);
      return ids.some(id => providerIds.includes(id)) ? movie : null;
    }));
    matches.push(...batch.filter((movie): movie is MovieSummary => movie !== null));
  }
  matches.sort((a, b) => b.popularity - a.popularity || a.id - b.id);
  return { movies: matches.slice((page - 1) * 20, page * 20), totalPages: Math.ceil(matches.length / 20) };
}
