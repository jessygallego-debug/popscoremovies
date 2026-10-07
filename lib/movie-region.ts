import { normalizeMovieRegion } from "./movie-locale";

export const MOVIE_REGION_COOKIE = "popscore_movie_region";

export function fixedMovieRegion(value?: string | null) {
  const region = normalizeMovieRegion(value);
  return /^[A-Z]{2}$/.test(region) && region !== "XX" ? region : "";
}

export function resolveMovieRegion(
  requestHeaders: { get(name: string): string | null },
  preference?: string | null,
) {
  const selected = fixedMovieRegion(preference);
  if (selected) return selected;
  for (const name of ["x-vercel-ip-country", "x-country-code", "cf-ipcountry", "cloudfront-viewer-country"]) {
    const region = fixedMovieRegion(requestHeaders.get(name));
    if (region) return region;
  }
  for (const tag of (requestHeaders.get("accept-language") ?? "").split(",")) {
    const country = tag.split(";")[0].trim().split(/[-_]/).slice(1)
      .find(part => /^[a-z]{2}$/i.test(part));
    const region = fixedMovieRegion(country);
    if (region) return region;
  }
  return "US";
}

export function syncMovieRegionCookie(preference?: string | null) {
  const region = fixedMovieRegion(preference);
  const current = document.cookie.split(";").map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${MOVIE_REGION_COOKIE}=`))?.split("=")[1] ?? "";
  if (current === region) return false;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${MOVIE_REGION_COOKIE}=${region}; Path=/; Max-Age=${region ? 31536000 : 0}; SameSite=Lax${secure}`;
  return true;
}
