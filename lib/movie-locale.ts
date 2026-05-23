export type MovieLanguageOption = {
  label: string;
  value: string;
};

export type MovieRegionOption = {
  label: string;
  value: string;
};

export const FALLBACK_MOVIE_LANGUAGE = "en";

export const MOVIE_LANGUAGE_OPTIONS: MovieLanguageOption[] = [
  { label: "Arabic", value: "ar" },
  { label: "Bengali", value: "bn" },
  { label: "Chinese", value: "zh" },
  { label: "Dutch", value: "nl" },
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Hindi", value: "hi" },
  { label: "Indonesian", value: "id" },
  { label: "Italian", value: "it" },
  { label: "Japanese", value: "ja" },
  { label: "Korean", value: "ko" },
  { label: "Portuguese", value: "pt" },
  { label: "Russian", value: "ru" },
  { label: "Spanish", value: "es" },
  { label: "Swedish", value: "sv" },
  { label: "Tamil", value: "ta" },
  { label: "Telugu", value: "te" },
  { label: "Thai", value: "th" },
  { label: "Turkish", value: "tr" },
  { label: "Vietnamese", value: "vi" },
];

export const MOVIE_REGION_OPTIONS: MovieRegionOption[] = [
  { label: "No region preference", value: "" },
  { label: "Argentina", value: "AR" },
  { label: "Australia", value: "AU" },
  { label: "Brazil", value: "BR" },
  { label: "Canada", value: "CA" },
  { label: "China", value: "CN" },
  { label: "France", value: "FR" },
  { label: "Germany", value: "DE" },
  { label: "India", value: "IN" },
  { label: "Indonesia", value: "ID" },
  { label: "Italy", value: "IT" },
  { label: "Japan", value: "JP" },
  { label: "Mexico", value: "MX" },
  { label: "South Korea", value: "KR" },
  { label: "Spain", value: "ES" },
  { label: "United Kingdom", value: "GB" },
  { label: "United States", value: "US" },
];

function cleanLocalePart(value?: string | null) {
  return value?.trim().replace(/_/g, "-") ?? "";
}

export function normalizeMovieLanguage(value?: string | null) {
  const language = cleanLocalePart(value).split("-")[0]?.toLowerCase() ?? "";

  return /^[a-z]{2,3}$/.test(language) ? language : "";
}

export function normalizeMovieRegion(value?: string | null) {
  const localeParts = cleanLocalePart(value).split("-").filter(Boolean);
  const candidateParts =
    localeParts.length > 1 ? localeParts.slice(1) : localeParts;
  const region = candidateParts.find((part) =>
    /^[a-z]{2}$|^\d{3}$/i.test(part)
  );

  return region ? region.toUpperCase() : "";
}

export function movieLocalePartsFromTag(value?: string | null) {
  return {
    language: normalizeMovieLanguage(value),
    region: normalizeMovieRegion(value),
  };
}

export function movieLanguageLabel(language: string) {
  return (
    MOVIE_LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ??
    language.toUpperCase()
  );
}

export function movieRegionLabel(region: string) {
  return (
    MOVIE_REGION_OPTIONS.find((option) => option.value === region)?.label ??
    region
  );
}

export function movieLanguageOptionsWithSelection(language: string) {
  if (
    !language ||
    MOVIE_LANGUAGE_OPTIONS.some((option) => option.value === language)
  ) {
    return MOVIE_LANGUAGE_OPTIONS;
  }

  return [
    { label: movieLanguageLabel(language), value: language },
    ...MOVIE_LANGUAGE_OPTIONS,
  ];
}

export function movieRegionOptionsWithSelection(region: string) {
  if (!region || MOVIE_REGION_OPTIONS.some((option) => option.value === region)) {
    return MOVIE_REGION_OPTIONS;
  }

  return [
    MOVIE_REGION_OPTIONS[0],
    { label: movieRegionLabel(region), value: region },
    ...MOVIE_REGION_OPTIONS.slice(1),
  ];
}

export function tmdbLanguageTag(language: string, region?: string | null) {
  const normalizedLanguage = normalizeMovieLanguage(language);
  const normalizedRegion = normalizeMovieRegion(region);

  if (!normalizedLanguage) {
    return "";
  }

  return normalizedRegion
    ? `${normalizedLanguage}-${normalizedRegion}`
    : normalizedLanguage;
}
