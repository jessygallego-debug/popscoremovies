export type MovieSummary = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
};

export type MovieDetails = MovieSummary & {
  genres: { id: number; name: string }[];
  runtime: number | null;
  tagline: string;
};

type TmdbListResponse = {
  results?: MovieSummary[];
  total_pages?: number;
  status_message?: string;
};

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const MAX_MOVIE_RESULTS = 300;
const TMDB_PAGE_SIZE = 20;

function getToken() {
  return process.env.TMDB_API_TOKEN;
}

export function posterUrl(path: string | null, size = "w500") {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size = "w1280") {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null;
}

async function tmdbFetch<T>(path: string): Promise<T | null> {
  const token = getToken();

  if (!token) {
    return null;
  }

  const response = await fetch(`${TMDB_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function moviesPath(query: string, page: number) {
  const trimmedQuery = query.trim();

  return trimmedQuery
    ? `/search/movie?query=${encodeURIComponent(
        trimmedQuery
      )}&include_adult=false&language=en-US&page=${page}`
    : `/trending/movie/week?language=en-US&page=${page}`;
}

export async function getMovies(query = "", limit = MAX_MOVIE_RESULTS) {
  const requestedLimit = Math.min(Math.max(limit, 1), MAX_MOVIE_RESULTS);
  const requestedPages = Math.ceil(requestedLimit / TMDB_PAGE_SIZE);
  const movies: MovieSummary[] = [];
  let pageLimit = requestedPages;

  for (
    let page = 1;
    page <= pageLimit && movies.length < requestedLimit;
    page++
  ) {
    const data = await tmdbFetch<TmdbListResponse>(moviesPath(query, page));

    if (!data?.results?.length) {
      break;
    }

    movies.push(...data.results);
    pageLimit = Math.min(requestedPages, data.total_pages ?? requestedPages);
  }

  return movies.slice(0, requestedLimit);
}

export async function getMovie(id: string) {
  return tmdbFetch<MovieDetails>(`/movie/${id}?language=en-US`);
}

export function isTmdbConfigured() {
  return Boolean(getToken());
}
