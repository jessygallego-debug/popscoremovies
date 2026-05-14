"use client";

import { QuickReactionKey } from "@/lib/profile-config";

const SESSION_KEY = "popscore_supabase_session";

type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
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
  username: string;
  avatar_key: string;
  favorite_genre: string | null;
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

export type UserMovieRating = MovieMeta & {
  id: string;
  user_id: string;
  genre: string;
  genreNames: string[];
  ratings: Record<string, number>;
  weights: { key: string; weight: number }[];
  popscore: number;
  quick_reaction: QuickReactionKey;
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

function getSession(): SupabaseSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(SESSION_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as SupabaseSession;
  } catch {
    return null;
  }
}

function authHeaders(accessToken?: string) {
  const config = getSupabaseConfig();
  const token = accessToken ?? getSession()?.access_token ?? config?.key;

  if (!config || !token) {
    throw new Error("Supabase is not configured.");
  }

  return {
    apikey: config.key,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
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

  const response = await fetch(`${config.restUrl}${path}`, {
    ...options,
    headers: {
      ...authHeaders(accessToken),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}.`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
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

  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      access_token: authResponse.access_token,
      refresh_token: authResponse.refresh_token,
      expires_at: expiresAt,
    })
  );
}

export function consumeAuthRedirect() {
  if (typeof window === "undefined" || !window.location.hash) {
    return { error: null, signedIn: false };
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const errorDescription = hashParams.get("error_description");

  if (errorDescription) {
    window.history.replaceState(null, "", window.location.pathname);
    return {
      error: errorDescription.replace(/\+/g, " "),
      signedIn: false,
    };
  }

  const accessToken = hashParams.get("access_token");

  if (!accessToken) {
    return { error: null, signedIn: false };
  }

  const session: SupabaseSession = {
    access_token: accessToken,
    refresh_token: hashParams.get("refresh_token") ?? undefined,
    expires_at: Number(hashParams.get("expires_at")) || undefined,
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.history.replaceState(null, "", window.location.pathname);
  return { error: null, signedIn: true };
}

export async function sendMagicLink(email: string) {
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
      create_user: true,
      email,
      options: {
        email_redirect_to: getEmailRedirectUrl(),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      await readSupabaseAuthError(response, "Could not send sign-in link.")
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
  const session = getSession();

  if (!config || !session?.access_token) {
    return null;
  }

  const response = await fetch(`${config.authUrl}/user`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<SupabaseUser>;
}

export function signOut() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function normalizeUsername(username: string) {
  return username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
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

export async function getProfileByUserId(userId: string) {
  const rows = await supabaseFetch<ProfileRecord[]>(
    `/profiles?user_id=eq.${encodeURIComponent(userId)}&select=*`
  );

  return rows[0] ?? null;
}

export async function upsertProfile(profile: {
  userId: string;
  username: string;
  avatarKey: string;
  favoriteGenre: string;
}) {
  const rows = await supabaseFetch<ProfileRecord[]>(
    "/profiles?on_conflict=user_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        avatar_key: profile.avatarKey,
        favorite_genre: profile.favoriteGenre,
        user_id: profile.userId,
        username: normalizeUsername(profile.username),
      }),
    }
  );

  return rows[0];
}

function toSnakeScore(key: string) {
  return `${key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)}_score`;
}

function quickReactionForScore(popscore: number): QuickReactionKey {
  if (popscore >= 75) return "loved_it";
  if (popscore >= 40) return "worth_watching";
  return "trash";
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
  quick_reaction: QuickReactionKey;
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
    ratings: row.ratings,
    releaseDate: row.release_date,
    updated_at: row.updated_at,
    user_id: row.user_id,
    weights: row.weights,
  };
}

export async function saveUserMovieRating({
  genre,
  movie,
  popscore,
  questions,
  ratings,
}: {
  genre: string;
  movie: MovieMeta;
  popscore: number;
  questions: RatingQuestion[];
  ratings: Record<string, number>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const scoreColumns = Object.fromEntries(
    Object.entries(ratings).map(([key, value]) => [toSnakeScore(key), value])
  );

  const rows = await supabaseFetch<unknown[]>(
    "/movie_ratings?on_conflict=user_id,movie_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        ...scoreColumns,
        genre,
        genre_names: movie.genreNames ?? [],
        movie_id: movie.movieId,
        movie_title: movie.movieTitle,
        popscore,
        poster_path: movie.posterPath ?? null,
        quick_reaction: quickReactionForScore(popscore),
        ratings,
        release_date: movie.releaseDate ?? null,
        user_id: user.id,
        weights: questions,
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
