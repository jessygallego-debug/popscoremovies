"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddToWatchlistButton from "@/app/components/add-to-watchlist-button";
import MobileFilterMenu from "@/app/components/mobile-filter-menu";
import MoviePosterImage from "@/app/components/movie-poster-image";
import { usePopFile } from "@/app/components/popfile-provider";
import {
  FALLBACK_MOVIE_LANGUAGE,
  movieLanguageOptionsWithSelection,
  movieLocalePartsFromTag,
  movieRegionOptionsWithSelection,
  normalizeMovieLanguage,
  normalizeMovieRegion,
} from "@/lib/movie-locale";
import { MOVIE_FILTER_GENRES } from "@/lib/profile-config";
import { updateProfileDiscoveryPreferences } from "@/lib/profile-store";
import { MovieSummary, posterUrl } from "@/lib/tmdb";
import { movieHref } from "@/lib/urls";

const DISCOVERY_RECOMMENDATION_LIMIT = 10;
const DISCOVERY_LANGUAGE_STORAGE_KEY = "popscore-discovery-movie-language";
const DISCOVERY_REGION_STORAGE_KEY = "popscore-discovery-movie-region";
const DISCOVERY_INTERNATIONAL_STORAGE_KEY =
  "popscore-discovery-include-international";
const DISCOVERY_MOVIE_ERA_STORAGE_KEY = "popscore-discovery-movie-era";
const DISCOVERY_CUSTOM_YEAR_STORAGE_KEY = "popscore-discovery-custom-year";
const DEFAULT_MOVIE_ERA = "1960";

const movieEraOptions = [
  { label: "Any year", value: "any" },
  { label: "1960s and newer", value: "1960" },
  { label: "1970s and newer", value: "1970" },
  { label: "1980s and newer", value: "1980" },
  { label: "1990s and newer", value: "1990" },
  { label: "2000s and newer", value: "2000" },
  { label: "2010s and newer", value: "2010" },
  { label: "2020s and newer", value: "2020" },
  { label: "Custom year", value: "custom" },
] as const;

type MovieEraValue = (typeof movieEraOptions)[number]["value"];

function yearFromDate(releaseDate?: string | null) {
  return releaseDate?.slice(0, 4) || "TBA";
}

type DiscoveryRecommendation = MovieSummary & {
  explanation: string;
  overallPopScore: number;
  recommendationMode: "fallback" | "personalized";
  tasteMatchScore: number;
  totalRatings: number;
};

type RecommendationResponse = {
  highRatedCount: number;
  message: string;
  mode: "fallback" | "personalized";
  movies: DiscoveryRecommendation[];
};

function limitRecommendations(movies: DiscoveryRecommendation[]) {
  const seenMovieIds = new Set<number>();

  return movies
    .filter((movie) => {
      if (seenMovieIds.has(movie.id)) {
        return false;
      }

      seenMovieIds.add(movie.id);
      return true;
    })
    .slice(0, DISCOVERY_RECOMMENDATION_LIMIT);
}

function DiscoveryPoster({ movie }: { movie: DiscoveryRecommendation }) {
  const poster = posterUrl(movie.poster_path);

  return (
    <MoviePosterImage
      src={poster}
      alt={`${movie.title} recommended movie on PopScore`}
      sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
      className="object-cover transition duration-500 group-hover:scale-105"
      fallbackMovieId={String(movie.id)}
    />
  );
}

type DiscoverClientProps = {
  initialGenre: string;
};

function discoveryReturnPathForGenre(genreKey: string) {
  return `/discover?${new URLSearchParams({ genre: genreKey }).toString()}`;
}

function browserMovieLocalePreference() {
  const browserLocale =
    typeof navigator !== "undefined"
      ? navigator.languages?.[0] ?? navigator.language
      : "";
  const browserPreference = movieLocalePartsFromTag(browserLocale);

  return {
    language: browserPreference.language || FALLBACK_MOVIE_LANGUAGE,
    region: browserPreference.region,
  };
}

function isMovieEraValue(value?: string | null): value is MovieEraValue {
  return movieEraOptions.some((option) => option.value === value);
}

function normalizeCustomYear(value?: string | null) {
  const year = value?.trim() ?? "";

  if (!/^\d{4}$/.test(year)) {
    return "";
  }

  const yearNumber = Number(year);
  const nextYear = new Date().getFullYear() + 1;

  return yearNumber >= 1888 && yearNumber <= nextYear ? year : "";
}

export default function DiscoverClient({ initialGenre }: DiscoverClientProps) {
  const {
    isLoading: isProfileLoading,
    profile,
    setCachedProfile,
    user,
  } = usePopFile();
  const [genre, setGenre] = useState(initialGenre);
  const [movieEra, setMovieEra] = useState<MovieEraValue>(DEFAULT_MOVIE_ERA);
  const [customYear, setCustomYear] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState(
    FALLBACK_MOVIE_LANGUAGE
  );
  const [preferredRegion, setPreferredRegion] = useState("");
  const [includeInternationalMovies, setIncludeInternationalMovies] =
    useState(false);
  const [movies, setMovies] = useState<DiscoveryRecommendation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingMovies, setIsLoadingMovies] = useState(true);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [recommendationMessage, setRecommendationMessage] = useState("");
  const [recommendationMode, setRecommendationMode] =
    useState<RecommendationResponse["mode"]>("fallback");
  const [status, setStatus] = useState("");
  const loadedPreferenceUserIdRef = useRef<string | null>(null);

  const saveProfileDiscoveryPreferences = useCallback(
    (preferences: Parameters<typeof updateProfileDiscoveryPreferences>[0]) => {
      if (!user) {
        return;
      }

      updateProfileDiscoveryPreferences(preferences)
        .then((nextProfile) => {
          if (nextProfile) {
            setCachedProfile(nextProfile);
          }
        })
        .catch(() => {
          // Browser storage remains the fallback if account-backed preferences
          // cannot be saved yet.
        });
    },
    [setCachedProfile, user]
  );

  const selectedGenre = useMemo(
    () => MOVIE_FILTER_GENRES.find((nextGenre) => nextGenre.key === genre),
    [genre]
  );
  const visibleMovies = useMemo(
    () => limitRecommendations(movies),
    [movies]
  );
  const languageOptions = useMemo(
    () =>
      movieLanguageOptionsWithSelection(preferredLanguage).map((option) => ({
        label: option.label,
        value: option.value,
      })),
    [preferredLanguage]
  );
  const regionOptions = useMemo(
    () =>
      movieRegionOptionsWithSelection(preferredRegion).map((option) => ({
        label: option.label,
        value: option.value,
      })),
    [preferredRegion]
  );
  const minReleaseYear = useMemo(() => {
    if (movieEra === "any") {
      return "";
    }

    if (movieEra === "custom") {
      return normalizeCustomYear(customYear);
    }

    return movieEra;
  }, [customYear, movieEra]);
  const handleGenreChange = (nextGenreKey: string) => {
    if (genre === nextGenreKey) {
      return;
    }

    setIsLoadingMovies(true);
    setRecommendationMessage("");
    setStatus("");
    setGenre(nextGenreKey);
  };
  const handlePreferredLanguageChange = (nextLanguage: string) => {
    const normalizedLanguage =
      normalizeMovieLanguage(nextLanguage) || FALLBACK_MOVIE_LANGUAGE;

    setIsLoadingMovies(true);
    setRecommendationMessage("");
    setStatus("");
    setPreferredLanguage(normalizedLanguage);
    window.localStorage.setItem(
      DISCOVERY_LANGUAGE_STORAGE_KEY,
      normalizedLanguage
    );
    saveProfileDiscoveryPreferences({
      preferredMovieLanguage: normalizedLanguage,
    });
  };
  const handlePreferredRegionChange = (nextRegion: string) => {
    const normalizedRegion = normalizeMovieRegion(nextRegion);

    setIsLoadingMovies(true);
    setRecommendationMessage("");
    setStatus("");
    setPreferredRegion(normalizedRegion);
    window.localStorage.setItem(
      DISCOVERY_REGION_STORAGE_KEY,
      normalizedRegion || "none"
    );
    saveProfileDiscoveryPreferences({
      preferredMovieRegion: normalizedRegion || null,
    });
  };
  const handleMovieEraChange = (nextMovieEra: string) => {
    if (!isMovieEraValue(nextMovieEra)) {
      return;
    }

    setIsLoadingMovies(true);
    setRecommendationMessage("");
    setStatus("");
    setMovieEra(nextMovieEra);
    window.localStorage.setItem(DISCOVERY_MOVIE_ERA_STORAGE_KEY, nextMovieEra);
    saveProfileDiscoveryPreferences({
      preferredMovieEra: nextMovieEra,
    });
  };
  const handleCustomYearChange = (nextYear: string) => {
    const numbersOnly = nextYear.replace(/\D/g, "").slice(0, 4);

    setCustomYear(numbersOnly);
    window.localStorage.setItem(DISCOVERY_CUSTOM_YEAR_STORAGE_KEY, numbersOnly);
    saveProfileDiscoveryPreferences({
      preferredMovieCustomYear: normalizeCustomYear(numbersOnly) || null,
    });

    if (movieEra === "custom") {
      setIsLoadingMovies(true);
      setRecommendationMessage("");
      setStatus("");
    }
  };
  const handleInternationalToggle = (isIncluded: boolean) => {
    setIsLoadingMovies(true);
    setRecommendationMessage("");
    setStatus("");
    setIncludeInternationalMovies(isIncluded);
    window.localStorage.setItem(
      DISCOVERY_INTERNATIONAL_STORAGE_KEY,
      String(isIncluded)
    );
    saveProfileDiscoveryPreferences({
      includeInternationalMovies: isIncluded,
    });
  };

  useEffect(() => {
    if (isProfileLoading) {
      return;
    }

    const preferenceUserKey = user?.id ?? "guest";

    if (loadedPreferenceUserIdRef.current === preferenceUserKey) {
      return;
    }

    loadedPreferenceUserIdRef.current = preferenceUserKey;
    let isCurrent = true;

    Promise.resolve().then(() => {
      if (!isCurrent) {
        return;
      }

      try {
        const browserPreference = browserMovieLocalePreference();
        const storedLanguage = normalizeMovieLanguage(
          window.localStorage.getItem(DISCOVERY_LANGUAGE_STORAGE_KEY)
        );
        const storedRegionValue = window.localStorage.getItem(
          DISCOVERY_REGION_STORAGE_KEY
        );
        const hasStoredRegion = storedRegionValue !== null;
        const storedRegion =
          storedRegionValue === "none"
            ? ""
            : normalizeMovieRegion(storedRegionValue);
        const storedInternational = window.localStorage.getItem(
          DISCOVERY_INTERNATIONAL_STORAGE_KEY
        );
        const storedMovieEra = window.localStorage.getItem(
          DISCOVERY_MOVIE_ERA_STORAGE_KEY
        );
        const storedCustomYear = normalizeCustomYear(
          window.localStorage.getItem(DISCOVERY_CUSTOM_YEAR_STORAGE_KEY)
        );
        const profileLanguage = normalizeMovieLanguage(
          profile?.preferred_movie_language
        );
        const profileRegion = normalizeMovieRegion(
          profile?.preferred_movie_region
        );
        const profileMovieEra = isMovieEraValue(profile?.preferred_movie_era)
          ? profile.preferred_movie_era
          : null;
        const profileCustomYear = normalizeCustomYear(
          profile?.preferred_movie_custom_year
        );

        setUserId(user?.id ?? null);
        setPreferredLanguage(
          profileLanguage ||
            storedLanguage ||
            browserPreference.language ||
            FALLBACK_MOVIE_LANGUAGE
        );
        setPreferredRegion(
          profileRegion ||
            (hasStoredRegion ? storedRegion : browserPreference.region)
        );
        setIncludeInternationalMovies(
          profile?.include_international_movies ?? storedInternational === "true"
        );
        setMovieEra(
          profileMovieEra ??
            (isMovieEraValue(storedMovieEra)
              ? storedMovieEra
              : DEFAULT_MOVIE_ERA)
        );
        setCustomYear(profileCustomYear || storedCustomYear);
        setIsLoadingPreferences(false);
        setIsLoadingUser(false);
      } catch (error) {
        const browserPreference = browserMovieLocalePreference();

        setPreferredLanguage(
          browserPreference.language || FALLBACK_MOVIE_LANGUAGE
        );
        setPreferredRegion(browserPreference.region);
        setMovieEra(DEFAULT_MOVIE_ERA);
        setStatus(error instanceof Error ? error.message : "");
        setIsLoadingPreferences(false);
        setIsLoadingUser(false);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [isProfileLoading, profile, user]);

  useEffect(() => {
    let isCurrent = true;
    const params = new URLSearchParams({ genre });

    if (isLoadingUser || isLoadingPreferences) {
      return () => {
        isCurrent = false;
      };
    }

    if (userId) {
      params.set("userId", userId);
    }

    params.set("preferredLanguage", preferredLanguage);
    params.set("includeInternationalMovies", String(includeInternationalMovies));

    if (minReleaseYear) {
      params.set("minReleaseYear", minReleaseYear);
    }

    if (preferredRegion) {
      params.set("preferredRegion", preferredRegion);
    }

    fetch(`/api/recommendations?${params.toString()}`)
      .then((response) => response.json())
      .then((data: RecommendationResponse) => {
        if (!isCurrent) {
          return;
        }

        setMovies(limitRecommendations(data.movies ?? []));
        setRecommendationMessage(data.message ?? "");
        setRecommendationMode(data.mode ?? "fallback");
        setStatus("");
      })
      .catch((error: Error) => {
        if (!isCurrent) {
          return;
        }

        setMovies([]);
        setRecommendationMessage("");
        setStatus(error.message);
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingMovies(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    genre,
    includeInternationalMovies,
    isLoadingPreferences,
    isLoadingUser,
    minReleaseYear,
    preferredLanguage,
    preferredRegion,
    userId,
  ]);

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="relative z-[250] overflow-visible rounded-[1.5rem] border border-slate-800/80 bg-slate-950/65 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5 sm:gap-4">
          <div>
            <h2 className="text-xl font-black text-white sm:text-3xl">
              Explore Movies by Genre
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400 sm:mt-2 sm:text-sm">
              Pick a lane and find movie recommendations that match your mood.
            </p>
          </div>
          {isLoadingUser ? (
            <p className="text-xs font-bold text-slate-400 sm:text-sm">
              Checking your PopScore taste...
            </p>
          ) : null}
        </div>

        <MobileFilterMenu
          label="Genre filter"
          onSelect={handleGenreChange}
          options={MOVIE_FILTER_GENRES.map((nextGenre) => ({
            label: nextGenre.label,
            value: nextGenre.key,
          }))}
          selectedValue={genre}
        />

        <div className="hidden gap-2 overflow-visible pb-1 md:grid md:grid-cols-5 md:gap-3 lg:grid-cols-8">
          {MOVIE_FILTER_GENRES.map((nextGenre) => (
            <button
              key={nextGenre.key}
              type="button"
              onClick={() => handleGenreChange(nextGenre.key)}
              className={`inline-flex min-h-9 w-full max-w-full items-center justify-center rounded-full border px-2 py-1.5 text-center text-[11px] font-black leading-tight transition sm:min-h-10 sm:px-3 sm:text-sm md:min-h-12 md:px-4 ${
                genre === nextGenre.key
                  ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-300 shadow-inner shadow-black/20"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-yellow-400 hover:text-yellow-300"
              }`}
            >
              {nextGenre.label}
            </button>
          ))}
          {MOVIE_FILTER_GENRES.length % 8 ? (
            <span aria-hidden="true" className="hidden lg:block" />
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 items-end gap-2 border-t border-slate-800 pt-3 md:grid-cols-[minmax(160px,1fr)_minmax(180px,1fr)_minmax(170px,1fr)_minmax(210px,auto)] md:gap-3">
          <MobileFilterMenu
            className="order-3 relative z-[430] w-full md:order-1"
            label="Movie Era"
            onSelect={handleMovieEraChange}
            options={movieEraOptions.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            selectedValue={movieEra}
            summaryClassName="flex min-h-10 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-full border border-yellow-400/55 bg-[#020617] px-3 text-xs font-black text-yellow-300 shadow-inner shadow-black/30 outline-none transition hover:border-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-200 sm:text-sm [&::-webkit-details-marker]:hidden"
          />
          <MobileFilterMenu
            className="order-1 relative z-[420] w-full md:order-2"
            label="Preferred Movie Language"
            onSelect={handlePreferredLanguageChange}
            options={languageOptions}
            selectedValue={preferredLanguage}
            summaryClassName="flex min-h-10 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-full border border-yellow-400/55 bg-[#020617] px-3 text-xs font-black text-yellow-300 shadow-inner shadow-black/30 outline-none transition hover:border-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-200 sm:text-sm [&::-webkit-details-marker]:hidden"
          />
          <MobileFilterMenu
            className="order-2 relative z-[410] w-full md:order-3"
            label="Preferred Region"
            onSelect={handlePreferredRegionChange}
            options={regionOptions}
            selectedValue={preferredRegion}
            summaryClassName="flex min-h-10 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-full border border-yellow-400/55 bg-[#020617] px-3 text-xs font-black text-yellow-300 shadow-inner shadow-black/30 outline-none transition hover:border-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-200 sm:text-sm [&::-webkit-details-marker]:hidden"
          />

          <label className="order-4 grid w-full gap-1.5 md:order-4">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              International
            </span>
            <span className="flex h-10 min-h-10 w-full items-center gap-2 overflow-hidden rounded-full border border-slate-700 bg-black/30 px-2 text-[10px] font-black text-slate-200 transition hover:border-yellow-400/50 sm:px-3 sm:text-sm md:whitespace-nowrap md:text-xs lg:text-sm">
              <input
                type="checkbox"
                checked={includeInternationalMovies}
                onChange={(event) =>
                  handleInternationalToggle(event.target.checked)
                }
                className="h-3.5 w-3.5 shrink-0 accent-yellow-400"
              />
              <span className="min-w-0 leading-[1.05]">
                Include international movies
              </span>
            </span>
          </label>

          {movieEra === "custom" ? (
            <label className="order-5 col-span-2 grid gap-1.5 md:col-span-1 md:col-start-1">
              <span className="px-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Custom year
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={customYear}
                onChange={(event) => handleCustomYearChange(event.target.value)}
                placeholder="1955"
                className="min-h-10 rounded-full border border-slate-700 bg-black/30 px-3 text-sm font-black text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-yellow-400/70"
              />
            </label>
          ) : null}
        </div>
      </div>

      {status ? (
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100">
          {status}
        </div>
      ) : null}

      {!isLoadingMovies && recommendationMessage ? (
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-400/10 p-4 text-sm font-bold text-yellow-100">
          {recommendationMessage}
        </div>
      ) : null}

      {isLoadingMovies ? (
        <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/75 p-8 font-bold text-slate-300 shadow-2xl shadow-black/30">
          Loading {selectedGenre?.label ?? "movie"} picks...
        </div>
      ) : null}

      {!isLoadingMovies && visibleMovies.length === 0 ? (
        <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/75 p-8 text-center shadow-2xl shadow-black/30">
          <h2 className="text-2xl font-black text-white">
            No new picks here yet
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-400">
            Try another genre, adjust the movie era, change your movie
            language, or include international movies.
          </p>
        </div>
      ) : null}

      {!isLoadingMovies && visibleMovies.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300 sm:text-xs sm:tracking-[0.22em]">
              {recommendationMode === "personalized"
                ? "Personalized Picks"
                : "Popular Genre Picks"}
            </p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
              {visibleMovies.length} {selectedGenre?.label ?? "Movie"} recommendations
              based on your ratings
            </h2>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {visibleMovies.map((movie) => {
          const discoveryReturnPath = discoveryReturnPathForGenre(genre);
          const detailsHref = movieHref(movie);
          const rateParams = new URLSearchParams({
            from: "discover",
            genre,
            movie: String(movie.id),
            returnTo: discoveryReturnPath,
          });
          const rateHref = `/rate?${rateParams.toString()}`;

          return (
            <article
              key={movie.id}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/85 p-3 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/50 hover:shadow-yellow-400/10 sm:rounded-[1.5rem] sm:p-4"
            >
              <Link href={detailsHref} className="block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl shadow-black/30 sm:rounded-[1.35rem]">
                  <DiscoveryPoster movie={movie} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute left-2 top-2 rounded-full border border-yellow-300/60 bg-black/75 px-2 py-1 text-[10px] font-black text-yellow-200 shadow-lg shadow-yellow-400/15 sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-sm">
                    {movie.tasteMatchScore}% Match
                  </div>
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 sm:bottom-4 sm:left-4 sm:gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-yellow-400 bg-black/70 text-sm font-black text-white shadow-lg shadow-yellow-400/20 sm:h-14 sm:w-14 sm:text-xl">
                      {movie.totalRatings > 0 ? movie.overallPopScore : "NR"}
                    </span>
                    <span className="text-[10px] font-black text-white sm:text-xs">
                      PopScore
                      <span className="block text-[9px] font-bold text-slate-300 sm:text-[11px]">
                        {movie.totalRatings > 0
                          ? `${movie.totalRatings} ratings`
                          : "Trending pick"}
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
              <div className="flex flex-1 flex-col pt-3 sm:pt-4">
                <h2 className="line-clamp-2 text-sm font-black leading-tight text-white sm:text-xl">
                  {movie.title}
                </h2>
                <p className="mt-1 text-[11px] font-bold text-slate-400 sm:mt-2 sm:text-sm">
                  {selectedGenre?.label ?? "Movie"} ·{" "}
                  {yearFromDate(movie.release_date)}
                </p>

                <div className="mt-auto grid gap-2 pt-3 sm:pt-4">
                  <Link
                    href={rateHref}
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-yellow-400 px-3 text-xs font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:min-h-11 sm:px-4 sm:text-sm"
                  >
                    Rate Now
                  </Link>
                  <AddToWatchlistButton
                    movie={{
                      genre: selectedGenre?.key,
                      genreNames: selectedGenre ? [selectedGenre.label] : [],
                      movieId: String(movie.id),
                      movieTitle: movie.title,
                      posterPath: movie.poster_path,
                      releaseDate: movie.release_date,
                    }}
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-700 px-3 text-xs font-black text-slate-300 transition hover:border-yellow-400 hover:text-yellow-300 sm:min-h-11 sm:px-4 sm:text-sm"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
