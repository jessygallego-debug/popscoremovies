"use client";

import {
  avatarForKey,
  genreLabelForKey,
  profileGenreDbValue,
} from "@/lib/profile-config";
import { validateReviewComment } from "@/lib/review-comments";

const SESSION_KEY = "popscore_supabase_session";
const SESSION_MAX_IDLE_SECONDS = 90 * 24 * 60 * 60;
const SESSION_REFRESH_BUFFER_SECONDS = 60;
const SUPABASE_READ_RETRY_DELAYS_MS = [350, 900];
const SUPABASE_READ_TIMEOUT_MS = 12000;

type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  last_used_at?: number;
};

type SupabaseAuthResponse = SupabaseSession & {
  expires_in?: number;
  user?: SupabaseUser;
};

export type SupabaseUser = {
  id: string;
  email?: string;
};

export type ProfileRecord = {
  id: string;
  user_id: string;
  email?: string | null;
  email_achievement_notifications?: boolean | null;
  username: string;
  avatar_key: string;
  favorite_genre: string | null;
  include_international_movies?: boolean | null;
  preferred_movie_custom_year?: string | null;
  preferred_movie_era?: string | null;
  preferred_movie_language?: string | null;
  preferred_movie_region?: string | null;
  created_at: string;
  updated_at: string;
};

export type MovieMeta = {
  movieId: string;
  movieTitle: string;
  posterPath?: string | null;
  releaseDate?: string | null;
  genreNames?: string[];
};

export type ProfileQuickReaction = "loved_it" | "worth_watching" | "trash";
export type UserMovieRatingSource = "movie_match";

export type UserMovieRating = MovieMeta & {
  id: string;
  user_id: string;
  genre: string;
  genreNames: string[];
  ratings: Record<string, number>;
  weights: { key: string; weight: number }[];
  popscore: number;
  quick_reaction: ProfileQuickReaction | null;
  ratingSource: UserMovieRatingSource | null;
  reviewComment: string | null;
  created_at: string;
  updated_at: string;
};

export type WatchlistMovie = MovieMeta & {
  id: string;
  user_id: string;
  genre?: string | null;
  genreNames: string[];
  created_at: string;
};

export type UserRatingCount = {
  userId: string;
  ratingsCount: number;
};

export type CommunityRatingFeedItem = UserMovieRating & {
  avatar: string;
  username: string;
};

export type TopReviewerSummary = {
  avatar: string;
  totalReviews: number;
  userId: string;
  username: string;
};

export type DiscoverableUserSummary = {
  avatar: string;
  displayName: string;
  favoriteGenre: string;
  followersCount: number;
  totalReviews: number;
  userId: string;
  username: string;
};

type RatingQuestion = {
  key: string;
  weight: number;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  return {
    authUrl: `${url.replace(/\/$/, "")}/auth/v1`,
    key,
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`,
  };
}

function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

function writeSession(session: SupabaseSession) {
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      ...session,
      last_used_at: Math.floor(Date.now() / 1000),
    })
  );
}

function getSession(): SupabaseSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(SESSION_KEY);

  if (!stored) {
    return null;
  }

  try {
    const session = JSON.parse(stored) as SupabaseSession;
    const now = Math.floor(Date.now() / 1000);

    if (
      session.last_used_at &&
      now - session.last_used_at > SESSION_MAX_IDLE_SECONDS
    ) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

async function refreshAuthSession(session: SupabaseSession) {
  const config = getSupabaseConfig();

  if (!config || !session.refresh_token) {
    clearSession();
    return null;
  }

  const response = await fetch(`${config.authUrl}/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: config.key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: session.refresh_token,
    }),
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const authResponse = (await response.json()) as SupabaseAuthResponse;
  saveAuthSession(authResponse);
  return getSession();
}

export async function getSupabaseAccessToken() {
  const session = getSession();

  if (!session?.access_token) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const shouldRefresh =
    session.expires_at && session.expires_at - now <= SESSION_REFRESH_BUFFER_SECONDS;
  const activeSession = shouldRefresh
    ? await refreshAuthSession(session)
    : session;

  if (!activeSession?.access_token) {
    return null;
  }

  writeSession(activeSession);
  return activeSession.access_token;
}

async function authHeaders(accessToken?: string) {
  const config = getSupabaseConfig();
  const token = accessToken ?? (await getSupabaseAccessToken()) ?? config?.key;

  if (!config || !token) {
    throw new Error("Supabase is not configured.");
  }

  return {
    apikey: config.key,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function waitForRetry(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isReadRequest(options: RequestInit) {
  const method = (options.method ?? "GET").toUpperCase();

  return method === "GET" || method === "HEAD";
}

function isRetryableSupabaseStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

async function fetchWithReadRetry(
  input: RequestInfo | URL,
  options: RequestInit = {}
) {
  if (!isReadRequest(options)) {
    return fetch(input, options);
  }

  let lastError: unknown = null;

  for (
    let attempt = 0;
    attempt <= SUPABASE_READ_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    const controller = options.signal ? null : new AbortController();
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), SUPABASE_READ_TIMEOUT_MS)
      : null;

    try {
      const response = await fetch(input, {
        ...options,
        signal: options.signal ?? controller?.signal,
      });

      if (
        !response.ok &&
        isRetryableSupabaseStatus(response.status) &&
        attempt < SUPABASE_READ_RETRY_DELAYS_MS.length
      ) {
        await response.text().catch(() => "");
        await waitForRetry(SUPABASE_READ_RETRY_DELAYS_MS[attempt]);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt >= SUPABASE_READ_RETRY_DELAYS_MS.length) {
        throw error;
      }

      await waitForRetry(SUPABASE_READ_RETRY_DELAYS_MS[attempt]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Supabase request failed.");
}

async function supabaseFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetchWithReadRetry(`${config.restUrl}${path}`, {
    ...options,
    headers: {
      ...(await authHeaders(accessToken)),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      await readSupabaseRestError(
        response,
        `Supabase request failed with ${response.status}.`
      )
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  const responseText = await response.text();

  if (!responseText) {
    return null as T;
  }

  return JSON.parse(responseText) as T;
}

async function readSupabaseRestError(response: Response, fallback: string) {
  let responseText = "";

  try {
    responseText = await response.text();
  } catch {
    return fallback;
  }

  if (!responseText) {
    return fallback;
  }

  try {
    const errorBody = JSON.parse(responseText) as {
      code?: string;
      details?: string;
      error?: string;
      error_description?: string;
      hint?: string;
      message?: string;
      msg?: string;
    };
    const message =
      errorBody.error_description ??
      errorBody.message ??
      errorBody.msg ??
      errorBody.error;
    const details = [
      message,
      errorBody.details ? `Details: ${errorBody.details}` : null,
      errorBody.hint ? `Hint: ${errorBody.hint}` : null,
      errorBody.code ? `Code: ${errorBody.code}` : null,
    ].filter(Boolean);

    return details.length ? `${fallback} ${details.join(" ")}` : fallback;
  } catch {
    return `${fallback} ${responseText.slice(0, 1000)}`;
  }
}

async function readSupabaseAuthError(
  response: Response,
  fallback: string
) {
  try {
    const errorBody = (await response.json()) as {
      error?: string;
      error_description?: string;
      message?: string;
      msg?: string;
    };

    return (
      errorBody.error_description ??
      errorBody.message ??
      errorBody.msg ??
      errorBody.error ??
      fallback
    );
  } catch {
    return fallback;
  }
}

function saveAuthSession(authResponse: SupabaseAuthResponse) {
  const expiresAt =
    authResponse.expires_at ??
    (authResponse.expires_in
      ? Math.floor(Date.now() / 1000) + authResponse.expires_in
      : undefined);

  writeSession({
    access_token: authResponse.access_token,
    refresh_token: authResponse.refresh_token,
    expires_at: expiresAt,
  });
}

export function consumeAuthRedirect() {
  if (typeof window === "undefined" || !window.location.hash) {
    return { error: null, signedIn: false, isPasswordRecovery: false };
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const errorDescription = hashParams.get("error_description");
  const authType = hashParams.get("type");

  if (errorDescription) {
    window.history.replaceState(null, "", window.location.pathname);
    return {
      error: errorDescription.replace(/\+/g, " "),
      signedIn: false,
      isPasswordRecovery: false,
    };
  }

  const accessToken = hashParams.get("access_token");

  if (!accessToken) {
    return {
      error: null,
      signedIn: false,
      isPasswordRecovery: authType === "recovery",
    };
  }

  const session: SupabaseSession = {
    access_token: accessToken,
    refresh_token: hashParams.get("refresh_token") ?? undefined,
    expires_at: Number(hashParams.get("expires_at")) || undefined,
  };

  writeSession(session);
  window.history.replaceState(null, "", window.location.pathname);
  return {
    error: null,
    signedIn: true,
    isPasswordRecovery: authType === "recovery",
  };
}

async function sendEmailOtp(
  email: string,
  options: {
    createUser: boolean;
    fallbackError: string;
    hideAuthErrors?: boolean;
  }
) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.authUrl}/otp`, {
    method: "POST",
    headers: {
      apikey: config.key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      create_user: options.createUser,
      email,
      options: {
        email_redirect_to: getEmailRedirectUrl(),
      },
    }),
  });

  if (!response.ok) {
    if (options.hideAuthErrors) {
      return;
    }

    throw new Error(await readSupabaseAuthError(response, options.fallbackError));
  }
}

export async function sendMagicLink(email: string) {
  return sendEmailOtp(email, {
    createUser: true,
    fallbackError: "Could not send sign-in link.",
  });
}

export async function sendUsernameReminder(email: string) {
  return sendEmailOtp(email, {
    createUser: false,
    fallbackError: "Could not send username reminder.",
    hideAuthErrors: true,
  });
}

export async function sendPasswordReset(email: string) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const redirectUrl = getEmailRedirectUrl();
  const response = await fetch(
    `${config.authUrl}/recover?redirect_to=${encodeURIComponent(redirectUrl)}`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await readSupabaseAuthError(
        response,
        "Could not send password reset email."
      )
    );
  }
}

export async function signInWithPassword(email: string, password: string) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(
    `${config.authUrl}/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await readSupabaseAuthError(response, "Could not sign in.")
    );
  }

  saveAuthSession((await response.json()) as SupabaseAuthResponse);
}

export async function signUpWithPassword(email: string, password: string) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.authUrl}/signup`, {
    method: "POST",
    headers: {
      apikey: config.key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      options: {
        email_redirect_to: getEmailRedirectUrl(),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      await readSupabaseAuthError(response, "Could not create account.")
    );
  }

  const authResponse = (await response.json()) as SupabaseAuthResponse;

  if (authResponse.access_token) {
    saveAuthSession(authResponse);
  }

  return Boolean(authResponse.access_token);
}

export async function getCurrentUser() {
  const config = getSupabaseConfig();
  const accessToken = await getSupabaseAccessToken();

  if (!config || !accessToken) {
    return null;
  }

  const response = await fetchWithReadRetry(`${config.authUrl}/user`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<SupabaseUser>;
}

export function signOut() {
  clearSession();
}

export async function updatePassword(password: string) {
  const config = getSupabaseConfig();
  const accessToken = await getSupabaseAccessToken();

  if (!config || !accessToken) {
    throw new Error("Open the reset link from your email before choosing a new password.");
  }

  const response = await fetch(`${config.authUrl}/user`, {
    method: "PUT",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error(
      await readSupabaseAuthError(response, "Could not update password.")
    );
  }
}

export function normalizeUsername(username: string) {
  return username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
}

const BLOCKED_USERNAME_WORDS = [
  "anal",
  "anus",
  "bitch",
  "blowjob",
  "boner",
  "boob",
  "clit",
  "cock",
  "cunt",
  "dick",
  "dildo",
  "fag",
  "fuck",
  "fuk",
  "hitler",
  "hoe",
  "jizz",
  "kike",
  "kkk",
  "nazi",
  "nigga",
  "nigger",
  "penis",
  "porn",
  "pussy",
  "rape",
  "rapist",
  "retard",
  "sex",
  "shit",
  "slut",
  "tits",
  "vagina",
  "whore",
];

function hasBlockedUsernameLanguage(username: string) {
  const normalized = normalizeUsername(username);
  const compact = normalized.replace(/_/g, "");
  const parts = normalized.split("_").filter(Boolean);

  return BLOCKED_USERNAME_WORDS.some((word) => {
    if (parts.includes(word)) {
      return true;
    }

    return compact.includes(word);
  });
}

export function validateUsername(username: string) {
  const normalized = normalizeUsername(username);

  if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
    throw new Error("Use 3-24 lowercase letters, numbers, or underscores.");
  }

  if (hasBlockedUsernameLanguage(normalized)) {
    throw new Error("Please choose a different username.");
  }

  return normalized;
}

function getEmailRedirectUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (siteUrl) {
    return `${siteUrl}/profile/edit`;
  }

  if (typeof window === "undefined") {
    return "https://popscoremovies.com/profile/edit";
  }

  const isLocalhost = ["localhost", "127.0.0.1"].includes(
    window.location.hostname
  );

  if (isLocalhost) {
    return `${window.location.origin}/profile/edit`;
  }

  return "https://popscoremovies.com/profile/edit";
}

export async function getProfileByUsername(username: string) {
  const rows = await supabaseFetch<ProfileRecord[]>(
    `/profiles?username=eq.${encodeURIComponent(username)}&select=*`
  );

  return rows[0] ?? null;
}

export async function getProfilesByUsernames(usernames: string[]) {
  const normalizedUsernames = Array.from(
    new Set(usernames.map(normalizeUsername))
  ).filter(Boolean);

  if (normalizedUsernames.length === 0) {
    return [];
  }

  return supabaseFetch<ProfileRecord[]>(
    `/profiles?username=in.(${inList(
      normalizedUsernames
    )})&select=id,user_id,username,avatar_key,favorite_genre,created_at,updated_at`
  ).catch(() => []);
}

export async function getProfileByUserId(userId: string) {
  const rows = await supabaseFetch<ProfileRecord[]>(
    `/profiles?user_id=eq.${encodeURIComponent(userId)}&select=*`
  );

  return rows[0] ?? null;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return getProfileByUserId(user.id);
}

export async function updateProfileDiscoveryPreferences(preferences: {
  includeInternationalMovies?: boolean;
  preferredMovieCustomYear?: string | null;
  preferredMovieEra?: string | null;
  preferredMovieLanguage?: string | null;
  preferredMovieRegion?: string | null;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const body: Record<string, boolean | string | null> = {};

  if ("includeInternationalMovies" in preferences) {
    body.include_international_movies =
      preferences.includeInternationalMovies ?? false;
  }

  if ("preferredMovieCustomYear" in preferences) {
    body.preferred_movie_custom_year =
      preferences.preferredMovieCustomYear || null;
  }

  if ("preferredMovieEra" in preferences) {
    body.preferred_movie_era = preferences.preferredMovieEra || null;
  }

  if ("preferredMovieLanguage" in preferences) {
    body.preferred_movie_language = preferences.preferredMovieLanguage || null;
  }

  if ("preferredMovieRegion" in preferences) {
    body.preferred_movie_region = preferences.preferredMovieRegion || null;
  }

  if (Object.keys(body).length === 0) {
    return getProfileByUserId(currentUser.id);
  }

  const rows = await supabaseFetch<ProfileRecord[]>(
    `/profiles?user_id=eq.${encodeURIComponent(currentUser.id)}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    }
  );

  return rows[0] ?? null;
}

export async function upsertProfile(profile: {
  userId: string;
  username: string;
  avatarKey: string;
  favoriteGenre: string;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Please sign in before saving your PopFile.");
  }

  if (currentUser.id !== profile.userId) {
    throw new Error(
      "Your PopFile session does not match the signed-in user. Please sign out and sign in again."
    );
  }

  const userId = currentUser.id;
  const favoriteGenre = profileGenreDbValue(profile.favoriteGenre);
  const existingProfile = await getProfileByUserId(userId);
  const username = validateUsername(profile.username);
  const usernameProfile = await getProfileByUsername(username);

  if (usernameProfile && usernameProfile.user_id !== userId) {
    throw new Error("That username is already taken.");
  }

  const rows = await supabaseFetch<ProfileRecord[]>(
    "/profiles?on_conflict=user_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        avatar_key: profile.avatarKey,
        favorite_genre: favoriteGenre,
        user_id: userId,
        username,
      }),
    }
  );

  const savedProfile = rows[0] ?? existingProfile;

  if (!savedProfile) {
    throw new Error("PopFile saved but could not be loaded. Please refresh and try again.");
  }

  return savedProfile;
}

function mapRatingRow(row: {
  id: string;
  user_id: string;
  movie_id: string;
  movie_title: string;
  poster_path: string | null;
  release_date: string | null;
  genre: string;
  genre_names: string[] | null;
  ratings: Record<string, number>;
  weights: { key: string; weight: number }[];
  popscore: number;
  quick_reaction: ProfileQuickReaction | null;
  rating_source?: UserMovieRatingSource | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
}): UserMovieRating {
  return {
    created_at: row.created_at,
    genre: row.genre,
    genreNames: row.genre_names ?? [],
    id: row.id,
    movieId: row.movie_id,
    movieTitle: row.movie_title,
    popscore: Number(row.popscore),
    posterPath: row.poster_path,
    quick_reaction: row.quick_reaction,
    ratingSource: row.rating_source ?? null,
    ratings: row.ratings,
    releaseDate: row.release_date,
    reviewComment: row.review_comment,
    updated_at: row.updated_at,
    user_id: row.user_id,
    weights: row.weights,
  };
}

function rowHasPopScoreRating(row: {
  ratings?: Record<string, number> | null;
  weights?: { key: string; weight: number }[] | null;
}) {
  return Boolean(
    row.weights?.length && row.ratings && Object.keys(row.ratings).length > 0
  );
}

function inList(values: string[]) {
  return values.map((value) => encodeURIComponent(value)).join(",");
}

function fallbackUsernameForUserId(userId: string) {
  return `user_${userId.slice(0, 8)}`;
}

async function getProfilesByUserIds(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return new Map<string, ProfileRecord>();
  }

  const profiles = await supabaseFetch<ProfileRecord[]>(
    `/profiles?user_id=in.(${inList(
      uniqueUserIds
    )})&select=user_id,username,avatar_key,id,favorite_genre,created_at,updated_at`
  ).catch(() => []);

  return new Map(profiles.map((profile) => [profile.user_id, profile]));
}

export async function saveUserMovieRating({
  genre,
  movie,
  popscore,
  questions,
  ratingSource,
  ratings,
  reviewComment = "",
}: {
  genre: string;
  movie: MovieMeta;
  popscore: number;
  questions: readonly RatingQuestion[];
  ratingSource?: UserMovieRatingSource;
  ratings: Record<string, number>;
  reviewComment?: string;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const reviewValidation = validateReviewComment(reviewComment);

  if (reviewValidation.error) {
    throw new Error(reviewValidation.error);
  }

  const ratingBody: {
    genre: string;
    genre_names: string[];
    movie_id: string;
    movie_title: string;
    popscore: number;
    poster_path: string | null;
    rating_source?: UserMovieRatingSource;
    ratings: Record<string, number>;
    release_date: string | null;
    review_comment?: string;
    user_id: string;
    weights: readonly RatingQuestion[];
  } = {
    genre,
    genre_names: movie.genreNames ?? [],
    movie_id: movie.movieId,
    movie_title: movie.movieTitle,
    popscore,
    poster_path: movie.posterPath ?? null,
    ratings,
    release_date: movie.releaseDate ?? null,
    user_id: user.id,
    weights: questions,
  };

  if (reviewValidation.reviewComment) {
    ratingBody.review_comment = reviewValidation.reviewComment;
  }

  if (ratingSource) {
    ratingBody.rating_source = ratingSource;
  }

  const saveWithRatingSourceFallback = async (
    path: string,
    options: RequestInit
  ) => {
    try {
      return await supabaseFetch<unknown[]>(path, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (!ratingSource || !message.includes("rating_source")) {
        throw error;
      }

      const fallbackBody = { ...ratingBody };
      delete fallbackBody.rating_source;

      return supabaseFetch<unknown[]>(path, {
        ...options,
        body: JSON.stringify(fallbackBody),
      });
    }
  };

  const existingRows = await supabaseFetch<{ id: string }[]>(
    `/movie_ratings?user_id=eq.${encodeURIComponent(
      user.id
    )}&movie_id=eq.${encodeURIComponent(movie.movieId)}&select=id`
  );

  if (existingRows[0]) {
    const rows = await saveWithRatingSourceFallback(
      `/movie_ratings?id=eq.${encodeURIComponent(existingRows[0].id)}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify(ratingBody),
      }
    );

    return rows[0] ?? existingRows[0];
  }

  const rows = await saveWithRatingSourceFallback(
    "/movie_ratings?on_conflict=user_id,movie_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(ratingBody),
    }
  );

  return rows[0] ?? null;
}

export async function saveUserQuickReaction({
  movie,
  quickReaction,
}: {
  movie: MovieMeta & { genre?: string };
  quickReaction: ProfileQuickReaction;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const existingRows = await supabaseFetch<{ id: string }[]>(
    `/movie_ratings?user_id=eq.${encodeURIComponent(
      user.id
    )}&movie_id=eq.${encodeURIComponent(movie.movieId)}&select=id`
  );

  if (existingRows[0]) {
    const patchBody: {
      genre?: string;
      genre_names?: string[];
      movie_title?: string;
      poster_path?: string | null;
      quick_reaction: ProfileQuickReaction;
      release_date?: string | null;
    } = {
      quick_reaction: quickReaction,
    };

    if (movie.genre ?? movie.genreNames?.[0]) {
      patchBody.genre = movie.genre ?? movie.genreNames?.[0];
    }

    if (movie.genreNames?.length) {
      patchBody.genre_names = movie.genreNames;
    }

    if (movie.movieTitle) {
      patchBody.movie_title = movie.movieTitle;
    }

    if (movie.posterPath) {
      patchBody.poster_path = movie.posterPath;
    }

    if (movie.releaseDate) {
      patchBody.release_date = movie.releaseDate;
    }

    await supabaseFetch(
      `/movie_ratings?id=eq.${encodeURIComponent(existingRows[0].id)}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify(patchBody),
      }
    );

    return existingRows[0];
  }

  const rows = await supabaseFetch<unknown[]>(
    "/movie_ratings?on_conflict=user_id,movie_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        genre: movie.genre ?? movie.genreNames?.[0] ?? "unknown",
        genre_names: movie.genreNames ?? [],
        movie_id: movie.movieId,
        movie_title: movie.movieTitle,
        popscore: 0,
        poster_path: movie.posterPath ?? null,
        quick_reaction: quickReaction,
        ratings: {},
        release_date: movie.releaseDate ?? null,
        user_id: user.id,
        weights: [],
      }),
    }
  );

  return rows[0] ?? null;
}

export async function getUserRatings(userId: string) {
  const rows = await supabaseFetch<Parameters<typeof mapRatingRow>[0][]>(
    `/movie_ratings?user_id=eq.${encodeURIComponent(
      userId
    )}&select=*&order=updated_at.desc`
  );

  return rows.map(mapRatingRow);
}

export async function getAllUserRatingCounts(): Promise<UserRatingCount[]> {
  type RatingCountRow = {
    movie_id: string;
    ratings: Record<string, number> | null;
    user_id: string;
    weights: { key: string; weight: number }[] | null;
  };

  const pageSize = 1000;
  const rows: RatingCountRow[] = [];
  let offset = 0;

  for (;;) {
    const page = await supabaseFetch<RatingCountRow[]>(
      `/movie_ratings?select=user_id,movie_id,ratings,weights&order=user_id.asc,movie_id.asc&limit=${pageSize}&offset=${offset}`
    );

    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  const moviesByUser = new Map<string, Set<string>>();

  rows.forEach((row) => {
    if (!rowHasPopScoreRating(row)) {
      return;
    }

    const movies = moviesByUser.get(row.user_id) ?? new Set<string>();
    movies.add(row.movie_id);
    moviesByUser.set(row.user_id, movies);
  });

  return Array.from(moviesByUser.entries()).map(([userId, movieIds]) => ({
    ratingsCount: movieIds.size,
    userId,
  }));
}

export async function getRecentCommunityRatings(
  limit = 20
): Promise<CommunityRatingFeedItem[]> {
  const currentProfile = await getCurrentProfile().catch(() => null);
  const rows = await supabaseFetch<Parameters<typeof mapRatingRow>[0][]>(
    `/movie_ratings?select=*&order=updated_at.desc&limit=${Math.max(
      limit * 4,
      limit
    )}`
  ).catch(() => []);
  const ratings = rows
    .filter((row) => rowHasPopScoreRating(row) && row.review_comment?.trim())
    .slice(0, limit)
    .map(mapRatingRow);
  const profilesByUserId = await getProfilesByUserIds(
    ratings.map((rating) => rating.user_id)
  );

  return ratings.map((rating) => {
    const profile =
      profilesByUserId.get(rating.user_id) ??
      (currentProfile?.user_id === rating.user_id ? currentProfile : null);

    return {
      ...rating,
      avatar: avatarForKey(profile?.avatar_key ?? "").icon,
      username: profile?.username ?? fallbackUsernameForUserId(rating.user_id),
    };
  });
}

export async function getRecentRatingsForUsers(
  userIds: string[],
  limit = 50
): Promise<CommunityRatingFeedItem[]> {
  const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);

  if (uniqueUserIds.length === 0) {
    return [];
  }

  const currentProfile = await getCurrentProfile().catch(() => null);
  const rows = await supabaseFetch<Parameters<typeof mapRatingRow>[0][]>(
    `/movie_ratings?user_id=in.(${inList(
      uniqueUserIds
    )})&select=*&order=updated_at.desc&limit=${limit}`
  ).catch(() => []);
  const ratings = rows.filter(rowHasPopScoreRating).map(mapRatingRow);
  const profilesByUserId = await getProfilesByUserIds(
    ratings.map((rating) => rating.user_id)
  );

  return ratings.map((rating) => {
    const profile =
      profilesByUserId.get(rating.user_id) ??
      (currentProfile?.user_id === rating.user_id ? currentProfile : null);

    return {
      ...rating,
      avatar: avatarForKey(profile?.avatar_key ?? "").icon,
      username: profile?.username ?? fallbackUsernameForUserId(rating.user_id),
    };
  });
}

export async function getTopReviewers(
  limit = 5
): Promise<TopReviewerSummary[]> {
  const currentProfile = await getCurrentProfile().catch(() => null);
  const counts = await getAllUserRatingCounts().catch(() => []);
  const sortedCounts = [...counts]
    .sort((a, b) => b.ratingsCount - a.ratingsCount)
    .slice(0, limit);
  const profilesByUserId = await getProfilesByUserIds(
    sortedCounts.map((count) => count.userId)
  );

  return sortedCounts.map((count) => {
    const profile =
      profilesByUserId.get(count.userId) ??
      (currentProfile?.user_id === count.userId ? currentProfile : null);

    return {
      avatar: avatarForKey(profile?.avatar_key ?? "").icon,
      totalReviews: count.ratingsCount,
      userId: count.userId,
      username: profile?.username ?? fallbackUsernameForUserId(count.userId),
    };
  });
}

export async function getDiscoverableUsers(
  limit = 80
): Promise<DiscoverableUserSummary[]> {
  type FollowCountRow = {
    following_id: string;
  };

  const currentUser = await getCurrentUser().catch(() => null);
  const [profiles, counts, follows] = await Promise.all([
    supabaseFetch<ProfileRecord[]>(
      `/profiles?select=id,user_id,username,avatar_key,favorite_genre,created_at,updated_at&order=username.asc&limit=${limit}`
    ).catch(() => []),
    getAllUserRatingCounts().catch(() => []),
    supabaseFetch<FollowCountRow[]>("/user_follows?select=following_id").catch(
      () => []
    ),
  ]);
  const reviewsByUser = new Map(
    counts.map((count) => [count.userId, count.ratingsCount])
  );
  const followersByUser = follows.reduce((totals, follow) => {
    totals.set(follow.following_id, (totals.get(follow.following_id) ?? 0) + 1);

    return totals;
  }, new Map<string, number>());

  return profiles
    .filter((profile) => profile.user_id !== currentUser?.id)
    .map((profile) => ({
      avatar: avatarForKey(profile.avatar_key).icon,
      displayName: profile.username,
      favoriteGenre: profile.favorite_genre
        ? genreLabelForKey(profile.favorite_genre)
        : "Not set",
      followersCount: followersByUser.get(profile.user_id) ?? 0,
      totalReviews: reviewsByUser.get(profile.user_id) ?? 0,
      userId: profile.user_id,
      username: profile.username,
    }))
    .sort(
      (a, b) =>
        b.totalReviews - a.totalReviews || a.username.localeCompare(b.username)
    );
}

export async function addToWatchlist(movie: MovieMeta & { genre?: string }) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Please sign in before adding movies to your watchlist.");
  }

  await supabaseFetch(
    "/watchlist?on_conflict=user_id,movie_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        genre: movie.genre ?? movie.genreNames?.[0] ?? null,
        genre_names: movie.genreNames ?? [],
        movie_id: movie.movieId,
        movie_title: movie.movieTitle,
        poster_path: movie.posterPath ?? null,
        release_date: movie.releaseDate ?? null,
        user_id: user.id,
      }),
    }
  );
}

function mapWatchlistRow(row: {
  id: string;
  user_id: string;
  movie_id: string;
  movie_title: string;
  poster_path: string | null;
  release_date: string | null;
  genre: string | null;
  genre_names: string[] | null;
  created_at: string;
}): WatchlistMovie {
  return {
    created_at: row.created_at,
    genre: row.genre,
    genreNames: row.genre_names ?? [],
    id: row.id,
    movieId: row.movie_id,
    movieTitle: row.movie_title,
    posterPath: row.poster_path,
    releaseDate: row.release_date,
    user_id: row.user_id,
  };
}

export async function getWatchlist(userId: string) {
  const rows = await supabaseFetch<Parameters<typeof mapWatchlistRow>[0][]>(
    `/watchlist?user_id=eq.${encodeURIComponent(
      userId
    )}&select=*&order=created_at.desc`
  );

  return rows.map(mapWatchlistRow);
}

export async function removeFromWatchlist(movieId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return;
  }

  await supabaseFetch(
    `/watchlist?user_id=eq.${encodeURIComponent(
      user.id
    )}&movie_id=eq.${encodeURIComponent(movieId)}`,
    { method: "DELETE" }
  );
}
