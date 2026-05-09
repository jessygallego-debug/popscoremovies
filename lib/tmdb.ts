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
  status_message?: string;
};

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

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

export async function getMovies(query = "") {
  const trimmedQuery = query.trim();
  const path = trimmedQuery
    ? `/search/movie?query=${encodeURIComponent(
        trimmedQuery
      )}&include_adult=false&language=en-US&page=1`
    : "/trending/movie/week?language=en-US";

  const data = await tmdbFetch<TmdbListResponse>(path);

  return data?.results ?? [];
}

export async function getMovie(id: string) {
  return tmdbFetch<MovieDetails>(`/movie/${id}?language=en-US`);
}

export function isTmdbConfigured() {
  return Boolean(getToken());
}
