import {
  getMovieSearchQueries,
  movieTitleSearchScore,
} from "@/lib/movie-search";
import { normalizeMovieRegion } from "@/lib/movie-locale";

export type MovieSummary = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language?: string;
  popularity: number;
  vote_average: number;
  release_date: string;
  genre_ids?: number[];
};

export type MovieDetails = MovieSummary & {
  genres: { id: number; name: string }[];
  keywords?: {
    keywords?: { id: number; name: string }[];
    results?: { id: number; name: string }[];
  };
  runtime: number | null;
  tagline: string;
  videos?: {
    results?: {
      id: string;
      key: string;
      name: string;
      official: boolean;
      site: string;
      type: string;
    }[];
  };
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

type TmdbMovieImage = {
  file_path: string | null;
  iso_639_1: string | null;
  vote_average?: number;
  vote_count?: number;
};

type TmdbMovieImagesResponse = {
  backdrops?: TmdbMovieImage[];
  posters?: TmdbMovieImage[];
};

type TmdbWatchProvider = {
  display_priority?: number;
  logo_path: string | null;
  provider_id: number;
  provider_name: string;
};

type TmdbMovieWatchProviderRegion = {
  ads?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
  flatrate?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  link?: string;
  rent?: TmdbWatchProvider[];
};

type TmdbMovieWatchProvidersResponse = {
  id: number;
  results?: Record<string, TmdbMovieWatchProviderRegion>;
};

type TmdbWatchProviderResponseKey =
  | "ads"
  | "buy"
  | "flatrate"
  | "free"
  | "rent";

type TmdbFetchOptions = {
  revalidate?: number;
};

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const MAX_MOVIE_RESULTS = 300;
const TMDB_PAGE_SIZE = 20;
const TMDB_DEFAULT_CACHE_SECONDS = 3600;
const TMDB_WATCH_PROVIDER_CACHE_SECONDS = 43200;
const ACTION_GENRE_ID = 28;
const ADVENTURE_GENRE_ID = 12;
const ANIMATION_GENRE_ID = 16;
const COMEDY_GENRE_ID = 35;
const DOCUMENTARY_GENRE_ID = 99;
const DRAMA_GENRE_ID = 18;
const FAMILY_GENRE_ID = 10751;
const FANTASY_GENRE_ID = 14;
const HORROR_GENRE_ID = 27;
const MUSIC_GENRE_ID = 10402;
const MYSTERY_GENRE_ID = 9648;
const ROMANCE_GENRE_ID = 10749;
const SCIENCE_FICTION_GENRE_ID = 878;
const THRILLER_GENRE_ID = 53;
const WAR_GENRE_ID = 10752;
const WESTERN_GENRE_ID = 37;
const MUSICAL_KEYWORD_ID = 4344;
const SUPERHERO_KEYWORD_ID = 9715;
export const ROMCOM_GENRE_FILTER_ID = "romcom";
export const SUPERHERO_GENRE_FILTER_ID = "superhero";
export const SUPERHERO_GENRE_FILTER_NAME = "Superhero";

export type MovieWatchProviderAvailability =
  | "subscription"
  | "free"
  | "rent-buy";

export type MovieWatchProvider = {
  availability: MovieWatchProviderAvailability;
  displayPriority: number;
  logoPath: string | null;
  providerId: number;
  providerName: string;
};

export type MovieWatchProviderGroup = {
  availability: MovieWatchProviderAvailability;
  label: string;
  providers: MovieWatchProvider[];
};

export type MovieWatchProviders = {
  groups: MovieWatchProviderGroup[];
  link: string | null;
  region: string;
};

const WATCH_PROVIDER_GROUPS = [
  {
    availability: "subscription",
    label: "Included with Subscription",
    responseKeys: ["flatrate"],
  },
  {
    availability: "free",
    label: "Free",
    responseKeys: ["free", "ads"],
  },
  {
    availability: "rent-buy",
    label: "Rent/Buy",
    responseKeys: ["rent", "buy"],
  },
] as const satisfies readonly {
  availability: MovieWatchProviderAvailability;
  label: string;
  responseKeys: readonly TmdbWatchProviderResponseKey[];
}[];

const WATCH_PROVIDER_PLATFORM_ALIASES: Record<string, string> = {
  "amazon prime video": "amazon",
  "amazon video": "amazon",
  "apple tv plus": "apple tv",
  "apple tv store": "apple tv",
  "peacock premium": "peacock",
  "peacock premium plus": "peacock",
  "netflix standard with ads": "netflix",
};

type RecommendationMovieOptions = {
  includeInternationalMovies?: boolean;
  preferredLanguage?: string;
  preferredRegion?: string;
};

type DiscoverGenreFilter = {
  searchAnyGenres?: readonly number[];
  searchFallbackGenres?: readonly number[];
  withAnyGenres?: readonly number[];
  withGenres?: readonly number[];
  withKeywords?: readonly number[];
  withoutGenres?: readonly number[];
};

const HARD_MISMATCH_GENRE_IDS = [
  HORROR_GENRE_ID,
  SCIENCE_FICTION_GENRE_ID,
  THRILLER_GENRE_ID,
] as const;

const CUSTOM_GENRE_FILTERS: Record<string, DiscoverGenreFilter> = {
  [String(FAMILY_GENRE_ID)]: {
    searchAnyGenres: [FAMILY_GENRE_ID, ANIMATION_GENRE_ID],
    withAnyGenres: [FAMILY_GENRE_ID, ANIMATION_GENRE_ID],
  },
  [String(MUSIC_GENRE_ID)]: {
    searchFallbackGenres: [MUSIC_GENRE_ID],
    withKeywords: [MUSICAL_KEYWORD_ID],
    withoutGenres: HARD_MISMATCH_GENRE_IDS,
  },
  [ROMCOM_GENRE_FILTER_ID]: {
    searchFallbackGenres: [ROMANCE_GENRE_ID, COMEDY_GENRE_ID],
    withGenres: [ROMANCE_GENRE_ID, COMEDY_GENRE_ID],
    withoutGenres: HARD_MISMATCH_GENRE_IDS,
  },
  [SUPERHERO_GENRE_FILTER_ID]: {
    searchAnyGenres: [
      ACTION_GENRE_ID,
      ADVENTURE_GENRE_ID,
      COMEDY_GENRE_ID,
      FANTASY_GENRE_ID,
      SCIENCE_FICTION_GENRE_ID,
    ],
    withKeywords: [SUPERHERO_KEYWORD_ID],
  },
};

export const MOVIE_GENRE_FILTERS = [
  { id: String(ACTION_GENRE_ID), name: "Action" },
  { id: String(ADVENTURE_GENRE_ID), name: "Adventure" },
  { id: String(ANIMATION_GENRE_ID), name: "Animation" },
  { id: String(COMEDY_GENRE_ID), name: "Comedy" },
  { id: String(DOCUMENTARY_GENRE_ID), name: "Documentary" },
  { id: String(DRAMA_GENRE_ID), name: "Drama" },
  { id: String(FAMILY_GENRE_ID), name: "Family" },
  { id: String(FANTASY_GENRE_ID), name: "Fantasy" },
  { id: String(HORROR_GENRE_ID), name: "Horror" },
  { id: String(MYSTERY_GENRE_ID), name: "Mystery" },
  { id: String(MUSIC_GENRE_ID), name: "Musical" },
  { id: String(ROMANCE_GENRE_ID), name: "Romance" },
  { id: ROMCOM_GENRE_FILTER_ID, name: "Rom-Com" },
  { id: String(SCIENCE_FICTION_GENRE_ID), name: "Sci-Fi" },
  { id: SUPERHERO_GENRE_FILTER_ID, name: SUPERHERO_GENRE_FILTER_NAME },
  { id: String(THRILLER_GENRE_ID), name: "Thriller" },
  { id: String(WAR_GENRE_ID), name: "War" },
  { id: String(WESTERN_GENRE_ID), name: "Western" },
];

function getToken() {
  return process.env.TMDB_API_TOKEN;
}

export function tmdbImagePath(path?: string | null) {
  const trimmedPath = path?.trim();

  if (
    !trimmedPath ||
    trimmedPath.toLowerCase() === "null" ||
    trimmedPath.toLowerCase() === "undefined"
  ) {
    return null;
  }

  if (trimmedPath.startsWith("http://") || trimmedPath.startsWith("https://")) {
    try {
      const url = new URL(trimmedPath);

      if (url.hostname !== "image.tmdb.org") {
        return null;
      }

      return url.pathname.match(/^\/t\/p\/[^/]+(\/.+)$/)?.[1] ?? null;
    } catch {
      return null;
    }
  }

  if (trimmedPath.startsWith("/_next/image")) {
    try {
      const nextImageUrl = new URL(trimmedPath, "https://popscoremovies.com");
      return tmdbImagePath(nextImageUrl.searchParams.get("url"));
    } catch {
      return null;
    }
  }

  if (trimmedPath.startsWith("/t/p/")) {
    return trimmedPath.match(/^\/t\/p\/[^/]+(\/.+)$/)?.[1] ?? null;
  }

  return trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;
}

function normalizeTmdbImageUrl(path: string | null, size: string) {
  try {
    const imagePath = tmdbImagePath(path);

    return imagePath ? `${TMDB_IMAGE_BASE_URL}/${size}${imagePath}` : null;
  } catch {
    return null;
  }
}

export function posterUrl(path: string | null, size = "w500") {
  return normalizeTmdbImageUrl(path, size);
}

export function backdropUrl(path: string | null, size = "w1280") {
  return normalizeTmdbImageUrl(path, size);
}

export function movieHasBrowseArtwork(movie: MovieSummary) {
  return Boolean(
    tmdbImagePath(movie.poster_path) && tmdbImagePath(movie.backdrop_path)
  );
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

async function parseTmdbJson<T>(response: Response) {
  try {
    const jsonText = await response.text();
    return JSON.parse(jsonText) as T;
  } catch {
    return null;
  }
}

async function tmdbFetch<T>(
  path: string,
  options: TmdbFetchOptions = {}
): Promise<T | null> {
  const token = getToken();

  if (!token) {
    return null;
  }

  const response = await fetch(`${TMDB_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Accept-Encoding": "identity",
    },
    next: { revalidate: options.revalidate ?? TMDB_DEFAULT_CACHE_SECONDS },
  });

  if (!response.ok) {
    return null;
  }

  return parseTmdbJson<T>(response);
}

function compareWatchProviders(
  firstProvider: MovieWatchProvider,
  secondProvider: MovieWatchProvider
) {
  const priorityDifference =
    firstProvider.displayPriority - secondProvider.displayPriority;

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return firstProvider.providerName.localeCompare(secondProvider.providerName);
}

function watchProviderDisplayPriority(provider: TmdbWatchProvider) {
  return typeof provider.display_priority === "number" &&
    Number.isFinite(provider.display_priority)
    ? provider.display_priority
    : Number.MAX_SAFE_INTEGER;
}

function normalizeWatchProviderName(providerName: string) {
  return providerName
    .replace(/\s*\((?:standard|basic)?\s*with ads\)\s*$/i, "")
    .replace(/\s+(?:standard|basic)?\s*with ads\s*$/i, "")
    .replace(/\s+(?:amazon|apple tv|roku premium)\s+channel\s*$/i, "")
    .replace(/\s+premium\s+plus\s*$/i, "")
    .replace(/\s+(?:premium|essential|ad-free|no ads)\s*$/i, "")
    .replace(/\s+store\s*$/i, "")
    .trim();
}

function watchProviderPlatformKey(providerName: string) {
  const normalizedName = normalizeWatchProviderName(providerName)
    .toLowerCase()
    .replace(/\+/g, " plus")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  return WATCH_PROVIDER_PLATFORM_ALIASES[normalizedName] ?? normalizedName;
}

function movieWatchProviderGroups(
  regionData: TmdbMovieWatchProviderRegion
): MovieWatchProviderGroup[] {
  const seenProviderKeys = new Set<string>();

  return WATCH_PROVIDER_GROUPS.map((group) => {
    const providers = group.responseKeys
      .flatMap((responseKey) => regionData[responseKey] ?? [])
      .filter((provider) => {
        const providerName = normalizeWatchProviderName(provider.provider_name);
        const providerKey = watchProviderPlatformKey(provider.provider_name);

        if (
          !providerName ||
          !Number.isFinite(provider.provider_id) ||
          !providerKey ||
          seenProviderKeys.has(providerKey)
        ) {
          return false;
        }

        seenProviderKeys.add(providerKey);
        return true;
      })
      .map<MovieWatchProvider>((provider) => ({
        availability: group.availability,
        displayPriority: watchProviderDisplayPriority(provider),
        logoPath: tmdbImagePath(provider.logo_path),
        providerId: provider.provider_id,
        providerName: normalizeWatchProviderName(provider.provider_name),
      }))
      .sort(compareWatchProviders);

    return {
      availability: group.availability,
      label: group.label,
      providers,
    };
  }).filter((group) => group.providers.length > 0);
}

function recentReleaseDates() {
  const today = new Date().toISOString().slice(0, 10);
  const recentCutoff = new Date();
  recentCutoff.setFullYear(recentCutoff.getFullYear() - 2);

  return {
    recentCutoffDate: recentCutoff.toISOString().slice(0, 10),
    today,
  };
}

function genreFilterForId(genreId = ""): DiscoverGenreFilter | null {
  const trimmedGenreId = genreId.trim();

  if (!trimmedGenreId) {
    return null;
  }

  const customFilter = CUSTOM_GENRE_FILTERS[trimmedGenreId];

  if (customFilter) {
    return customFilter;
  }

  const tmdbGenreId = Number(trimmedGenreId);

  if (!Number.isFinite(tmdbGenreId)) {
    return null;
  }

  return {
    searchFallbackGenres: [tmdbGenreId],
    withGenres: [tmdbGenreId],
  };
}

function addDiscoverGenreFilter(
  params: URLSearchParams,
  filter: DiscoverGenreFilter | null
) {
  if (!filter) {
    return;
  }

  if (filter.withGenres?.length || filter.withAnyGenres?.length) {
    params.set(
      "with_genres",
      filter.withGenres?.length
        ? filter.withGenres.join(",")
        : filter.withAnyGenres?.join("|") ?? ""
    );
  }

  if (filter.withKeywords?.length) {
    params.set("with_keywords", filter.withKeywords.join("|"));
  }

  if (filter.withoutGenres?.length) {
    params.set("without_genres", filter.withoutGenres.join(","));
  }
}

function hasAllGenreIds(movie: MovieSummary, genreIds: readonly number[] = []) {
  return genreIds.every((genreId) => movie.genre_ids?.includes(genreId));
}

function hasAnyGenreId(movie: MovieSummary, genreIds: readonly number[] = []) {
  return genreIds.some((genreId) => movie.genre_ids?.includes(genreId));
}

function movieMatchesGenreFilter(
  movie: MovieSummary,
  genreId = "",
  source: "discover" | "search" = "discover"
) {
  const filter = genreFilterForId(genreId);

  if (!filter) {
    return true;
  }

  const requiredGenres =
    source === "search"
      ? (filter.searchFallbackGenres ?? filter.withGenres)
      : filter.withGenres;
  const anyGenres =
    source === "search"
      ? (filter.searchAnyGenres ?? filter.withAnyGenres)
      : filter.withAnyGenres;

  return (
    hasAllGenreIds(movie, requiredGenres) &&
    (!anyGenres?.length || hasAnyGenreId(movie, anyGenres)) &&
    !hasAnyGenreId(movie, filter.withoutGenres)
  );
}

function discoverMoviesPath({
  genreId = "",
  includeInternationalMovies,
  includeRecentDates,
  page,
  preferredLanguage,
  preferredRegion,
}: {
  genreId?: string;
  includeRecentDates: boolean;
  page: number;
} & RecommendationMovieOptions) {
  const params = new URLSearchParams({
    include_adult: "false",
    include_video: "false",
    language: "en-US",
    page: String(page),
    sort_by: "popularity.desc",
  });

  if (includeRecentDates) {
    const { recentCutoffDate, today } = recentReleaseDates();

    params.set("primary_release_date.gte", recentCutoffDate);
    params.set("primary_release_date.lte", today);
  }

  addDiscoverGenreFilter(params, genreFilterForId(genreId));

  if (preferredLanguage) {
    params.set(
      "language",
      preferredRegion
        ? `${preferredLanguage}-${preferredRegion}`
        : preferredLanguage
    );

    if (!includeInternationalMovies) {
      params.set("with_original_language", preferredLanguage);
    }
  }

  if (preferredRegion) {
    params.set("region", preferredRegion);
  }

  return `/discover/movie?${params.toString()}`;
}

function moviesPath(query: string, page: number, genreId = "") {
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    const params = new URLSearchParams({
      include_adult: "false",
      language: "en-US",
      page: String(page),
      query: trimmedQuery,
    });

    return `/search/movie?${params.toString()}`;
  }

  return discoverMoviesPath({ genreId, includeRecentDates: true, page });
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

function uniqueMovies(movies: MovieSummary[]) {
  const seenMovieIds = new Set<number>();

  return movies.filter((movie) => {
    if (seenMovieIds.has(movie.id)) {
      return false;
    }

    seenMovieIds.add(movie.id);
    return true;
  });
}

function compareSearchMatches(query: string) {
  return (a: MovieSummary, b: MovieSummary) => {
    const scoreDifference =
      movieTitleSearchScore(a.title, query) -
      movieTitleSearchScore(b.title, query);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return compareLatestPopular(a, b);
  };
}

async function getFuzzyMovieFallbacks(
  query: string,
  limit: number,
  genreId = "",
  existingMovies: MovieSummary[] = []
) {
  const fallbackLimit = Math.min(MAX_MOVIE_RESULTS, Math.max(limit, 120));
  const fallbackPages = Math.ceil(fallbackLimit / TMDB_PAGE_SIZE);
  const existingMovieIds = new Set(existingMovies.map((movie) => movie.id));
  const movies: MovieSummary[] = [];

  for (
    let page = 1;
    page <= fallbackPages && movies.length < fallbackLimit;
    page++
  ) {
    const data = await tmdbFetch<TmdbListResponse>(
      discoverMoviesPath({ genreId, includeRecentDates: false, page })
    );

    if (!data?.results?.length) {
      break;
    }

    movies.push(
      ...data.results.filter(
        (movie) =>
          !existingMovieIds.has(movie.id) &&
          movieHasBrowseArtwork(movie) &&
          movieMatchesGenreFilter(movie, genreId) &&
          Number.isFinite(movieTitleSearchScore(movie.title, query))
      )
    );
  }

  return uniqueMovies(movies)
    .sort(compareSearchMatches(query))
    .slice(0, Math.max(limit - existingMovies.length, 0));
}

export async function getMovies(
  query = "",
  limit = MAX_MOVIE_RESULTS,
  genreId = ""
) {
  const requestedLimit = Math.min(Math.max(limit, 1), MAX_MOVIE_RESULTS);
  const requestedPages = Math.ceil(requestedLimit / TMDB_PAGE_SIZE);
  const movies: MovieSummary[] = [];
  const resultSource = query.trim() ? "search" : "discover";
  const searchQueries =
    resultSource === "search" ? getMovieSearchQueries(query) : [query];

  for (const searchQuery of searchQueries) {
    const isOriginalQuery = searchQuery === query;
    let pageLimit =
      resultSource === "search" && !isOriginalQuery
        ? Math.min(requestedPages, 3)
        : requestedPages;

    for (
      let page = 1;
      page <= pageLimit && uniqueMovies(movies).length < requestedLimit;
      page++
    ) {
      const data = await tmdbFetch<TmdbListResponse>(
        moviesPath(searchQuery, page, genreId)
      );

      if (!data?.results?.length) {
        break;
      }

      const nextMovies = data.results.filter(
        (movie) =>
          movieMatchesGenreFilter(movie, genreId, resultSource) &&
          (isOriginalQuery ||
            Number.isFinite(movieTitleSearchScore(movie.title, query))) &&
          (resultSource === "search" || movieHasBrowseArtwork(movie))
      );

      movies.push(...nextMovies);
      pageLimit = Math.min(pageLimit, data.total_pages ?? pageLimit);
    }
  }

  if (resultSource === "search") {
    const fuzzyMatches =
      movies.length < requestedLimit
        ? await getFuzzyMovieFallbacks(query, requestedLimit, genreId, movies)
        : [];

    return uniqueMovies([...movies, ...fuzzyMatches])
      .sort(compareSearchMatches(query))
      .slice(0, requestedLimit);
  }

  return uniqueMovies(movies).sort(compareLatestPopular).slice(0, requestedLimit);
}

function recommendationMoviesPath(
  page: number,
  genreId: string,
  options: RecommendationMovieOptions = {}
) {
  return discoverMoviesPath({
    genreId,
    includeRecentDates: false,
    page,
    ...options,
  });
}

export async function getRecommendationMovies(
  genreId: string,
  limit = MAX_MOVIE_RESULTS,
  options: RecommendationMovieOptions = {}
) {
  const requestedLimit = Math.min(Math.max(limit, 10), MAX_MOVIE_RESULTS);
  const requestedPages = Math.ceil(requestedLimit / TMDB_PAGE_SIZE);
  const movies: MovieSummary[] = [];
  let pageLimit = requestedPages;

  for (
    let page = 1;
    page <= pageLimit && movies.length < requestedLimit;
    page++
  ) {
    const data = await tmdbFetch<TmdbListResponse>(
      recommendationMoviesPath(page, genreId, options)
    );

    if (!data?.results?.length) {
      break;
    }

    const nextMovies = data.results.filter(
      (movie) =>
        movieMatchesGenreFilter(movie, genreId) && movieHasBrowseArtwork(movie)
    );

    movies.push(...nextMovies);
    pageLimit = Math.min(requestedPages, data.total_pages ?? requestedPages);
  }

  return movies.sort(compareLatestPopular).slice(0, requestedLimit);
}

export async function getMovie(id: string) {
  return tmdbFetch<MovieDetails>(
    `/movie/${id}?append_to_response=credits,videos,keywords`
  );
}

export async function getMovieWatchProviders(
  movieId: string,
  preferredRegion = "US"
): Promise<MovieWatchProviders | null> {
  const normalizedMovieId = movieId.trim();

  if (!/^\d+$/.test(normalizedMovieId)) {
    return null;
  }

  const region = normalizeMovieRegion(preferredRegion) || "US";
  const data = await tmdbFetch<TmdbMovieWatchProvidersResponse>(
    `/movie/${normalizedMovieId}/watch/providers`,
    { revalidate: TMDB_WATCH_PROVIDER_CACHE_SECONDS }
  );
  const regionData = data?.results?.[region];

  if (!regionData) {
    return null;
  }

  const groups = movieWatchProviderGroups(regionData);

  if (!groups.length) {
    return null;
  }

  return {
    groups,
    link: regionData.link ?? null,
    region,
  };
}

export function movieHasSuperheroKeyword(movie: MovieDetails) {
  const keywords = [
    ...(movie.keywords?.keywords ?? []),
    ...(movie.keywords?.results ?? []),
  ];

  return keywords.some(
    (keyword) =>
      keyword.id === SUPERHERO_KEYWORD_ID ||
      keyword.name.trim().toLowerCase() === "superhero"
  );
}

export function movieFilterGenreNames(movie: MovieDetails) {
  const genres = movie.genres.map((genre) => genre.name);

  if (movieHasSuperheroKeyword(movie)) {
    genres.push(SUPERHERO_GENRE_FILTER_NAME);
  }

  return Array.from(new Set(genres));
}

function bestImagePath(
  images: TmdbMovieImage[] = [],
  excludePaths: (string | null | undefined)[] = []
) {
  const excludedImagePaths = new Set(
    excludePaths
      .map((path) => tmdbImagePath(path))
      .filter((path): path is string => Boolean(path))
  );

  return [...images]
    .filter((image) => {
      const imagePath = tmdbImagePath(image.file_path);

      return Boolean(
        imagePath &&
          !excludedImagePaths.has(imagePath) &&
          posterUrl(imagePath)
      );
    })
    .sort((a, b) => {
      const languageScore =
        Number(b.iso_639_1 === null) - Number(a.iso_639_1 === null);

      if (languageScore !== 0) {
        return languageScore;
      }

      const voteCountDifference = (b.vote_count ?? 0) - (a.vote_count ?? 0);

      if (voteCountDifference !== 0) {
        return voteCountDifference;
      }

      return (b.vote_average ?? 0) - (a.vote_average ?? 0);
    })[0]?.file_path ?? null;
}

export async function getMovieImageFallbacks(
  id: string,
  excludePaths: (string | null | undefined)[] = []
) {
  const images = await tmdbFetch<TmdbMovieImagesResponse>(
    `/movie/${id}/images`
  );

  return {
    backdropPath: bestImagePath(images?.backdrops, excludePaths),
    posterPath: bestImagePath(images?.posters, excludePaths),
  };
}

export function isTmdbConfigured() {
  return Boolean(getToken());
}
