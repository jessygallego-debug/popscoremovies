export type MovieSummary = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  popularity: number;
  vote_average: number;
  release_date: string;
  genre_ids?: number[];
};

export type MovieDetails = MovieSummary & {
  genres: { id: number; name: string }[];
  runtime: number | null;
  tagline: string;
  credits?: {
    cast?: {
      id: number;
      name: string;
      character: string;
      order: number;
    }[];
    crew?: {
      id: number;
      name: string;
      job: string;
    }[];
  };
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

export const MOVIE_GENRE_FILTERS = [
  { id: "28", name: "Action" },
  { id: "16", name: "Animation" },
  { id: "35", name: "Comedy" },
  { id: "18", name: "Drama" },
  { id: "27", name: "Horror" },
  { id: "10402", name: "Musical" },
  { id: "10749", name: "Romance" },
  { id: "878", name: "Sci-Fi" },
  { id: "53", name: "Thriller" },
];

function getToken() {
  return process.env.TMDB_API_TOKEN;
}

export function posterUrl(path: string | null, size = "w500") {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size = "w1280") {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null;
}

export function formatReleaseMonthYear(releaseDate: string) {
  const [year, month] = releaseDate.split("-");
  const monthNumber = Number(month);

  if (!year || !monthNumber) {
    return "";
  }

  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(year), monthNumber - 1, 1)));

  return `${monthName} ${year}`;
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

function moviesPath(query: string, page: number, genreId = "") {
  const trimmedQuery = query.trim();
  const today = new Date().toISOString().slice(0, 10);
  const recentCutoff = new Date();
  recentCutoff.setFullYear(recentCutoff.getFullYear() - 2);
  const recentCutoffDate = recentCutoff.toISOString().slice(0, 10);

  if (trimmedQuery) {
    return `/search/movie?query=${encodeURIComponent(
        trimmedQuery
      )}&include_adult=false&language=en-US&page=${page}`;
  }

  if (genreId) {
    return `/discover/movie?include_adult=false&include_video=false&language=en-US&page=${page}&primary_release_date.gte=${recentCutoffDate}&primary_release_date.lte=${today}&sort_by=popularity.desc&with_genres=${genreId}`;
  }

  return `/discover/movie?include_adult=false&include_video=false&language=en-US&page=${page}&primary_release_date.gte=${recentCutoffDate}&primary_release_date.lte=${today}&sort_by=popularity.desc`;
}

function releaseTime(movie: MovieSummary) {
  const time = new Date(movie.release_date).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function compareLatestPopular(a: MovieSummary, b: MovieSummary) {
  const popularityDifference = (b.popularity ?? 0) - (a.popularity ?? 0);

  if (popularityDifference !== 0) {
    return popularityDifference;
  }

  return releaseTime(b) - releaseTime(a);
}

export async function getMovies(
  query = "",
  limit = MAX_MOVIE_RESULTS,
  genreId = ""
) {
  const requestedLimit = Math.min(Math.max(limit, 1), MAX_MOVIE_RESULTS);
  const requestedPages = Math.ceil(requestedLimit / TMDB_PAGE_SIZE);
  const movies: MovieSummary[] = [];
  let pageLimit = requestedPages;

  for (
    let page = 1;
    page <= pageLimit && movies.length < requestedLimit;
    page++
  ) {
    const data = await tmdbFetch<TmdbListResponse>(
      moviesPath(query, page, genreId)
    );

    if (!data?.results?.length) {
      break;
    }

    const nextMovies =
      query.trim() && genreId
        ? data.results.filter((movie) =>
            movie.genre_ids?.includes(Number(genreId))
          )
        : data.results;

    movies.push(...nextMovies);
    pageLimit = Math.min(requestedPages, data.total_pages ?? requestedPages);
  }

  return movies.sort(compareLatestPopular).slice(0, requestedLimit);
}

export async function getMovie(id: string) {
  return tmdbFetch<MovieDetails>(
    `/movie/${id}?language=en-US&append_to_response=credits`
  );
}

export function isTmdbConfigured() {
  return Boolean(getToken());
}
