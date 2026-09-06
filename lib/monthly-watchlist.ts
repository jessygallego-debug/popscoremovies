import { createHmac, timingSafeEqual } from "node:crypto";
import {
  monthlyWatchlistSubject,
  renderMonthlyWatchlistEmail,
  type MonthlyWatchlistCategory,
  type MonthlyWatchlistMovie,
} from "@/lib/monthly-watchlist-email";
import { absoluteUrl } from "@/lib/site-url";
import { tmdbImagePath } from "@/lib/tmdb";

type SupabaseConfig = {
  authUrl: string;
  restUrl: string;
  serviceRoleKey: string;
};

type AuthUser = {
  email?: string;
  email_confirmed_at?: string;
  id: string;
};

type CampaignRow = {
  error_message: string | null;
  failed_sends: number;
  finalized_at: string | null;
  generated_at: string;
  id: string;
  month: number;
  month_key: string;
  preview_text: string;
  recipient_count: number;
  sent_at: string | null;
  status: "draft" | "ready" | "sending" | "sent" | "failed";
  subject: string;
  successful_sends: number;
  year: number;
};

type CampaignMovieRow = {
  availability_type: "rent_buy" | "subscription";
  category: MonthlyWatchlistCategory;
  display_order: number;
  movie_id: string;
  movie_title: string;
  poster_path: string;
  provider: string | null;
  ranking_score: number | string;
  release_date: string;
  source_url: string;
  verified_at: string;
};

type RecipientRow = {
  email: string;
  id: string;
  status: "pending" | "sending" | "sent" | "failed" | "skipped";
  user_id: string;
};

type ReleaseFeedItem = {
  availabilityType?: string;
  category?: string;
  movieId?: number | string;
  provider?: string | null;
  rankingScore?: number;
  releaseDate?: string;
  sourceUrl?: string;
  verifiedAt?: string;
};

type TmdbCampaignMovie = {
  id: number;
  popularity?: number;
  poster_path?: string | null;
  release_date?: string;
  title?: string;
  vote_count?: number;
};

export type MonthlyWatchlistSnapshot = {
  campaign: {
    errorMessage: string | null;
    failedSends: number;
    finalizedAt: string | null;
    generatedAt: string;
    id: string;
    month: number;
    monthKey: string;
    previewText: string;
    recipientCount: number;
    sentAt: string | null;
    status: CampaignRow["status"];
    subject: string;
    successfulSends: number;
    year: number;
  };
  movies: MonthlyWatchlistMovie[];
  previewHtml: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";
const MAX_FEED_ITEMS = 40;
const MAX_ITEMS_PER_SECTION = 4;
const FEED_VERIFICATION_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000;
const PREVIEW_TEXT =
  "New digital releases, new streaming arrivals, and your next movie night.";

function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  const cleanUrl = url.replace(/\/$/, "");

  return {
    authUrl: `${cleanUrl}/auth/v1`,
    restUrl: `${cleanUrl}/rest/v1`,
    serviceRoleKey,
  };
}

async function supabaseRest<T>(path: string, init: RequestInit = {}) {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.restUrl}${path}`, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Supabase request failed (${response.status}): ${details}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function monthParts(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  if (!/^\d{4}-\d{2}-01$/.test(monthKey) || !year || month < 1 || month > 12) {
    throw new Error("Month must use YYYY-MM-01 format.");
  }

  return { month, year };
}

export function monthKeyWithOffset(date: Date, offset: number) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    timeZone: "America/New_York",
    year: "numeric",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  const target = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1 + offset, 1));

  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-01`;
}

export function easternCalendarParts(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "numeric",
      timeZone: "America/New_York",
      year: "numeric",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );

  return {
    day: Number(parts.day),
    month: Number(parts.month),
    year: Number(parts.year),
  };
}

function easternDateKey(date: Date) {
  const parts = easternCalendarParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day
  ).padStart(2, "0")}`;
}

function normalizedFeedItem(
  item: ReleaseFeedItem,
  monthKey: string,
  now: Date
): ReleaseFeedItem | null {
  const movieId = String(item.movieId ?? "").trim();
  const category = item.category;
  const availabilityType = item.availabilityType;
  const releaseDate = item.releaseDate?.trim() ?? "";
  const provider = item.provider?.trim() || null;
  const sourceUrl = item.sourceUrl?.trim() ?? "";
  const verifiedAt = item.verifiedAt?.trim() ?? "";
  const releaseMonth = releaseDate.slice(0, 7);
  const targetMonth = monthKey.slice(0, 7);
  const verifiedTime = Date.parse(verifiedAt);
  const verificationAge = now.getTime() - verifiedTime;
  let parsedSource: URL;

  try {
    parsedSource = new URL(sourceUrl);
  } catch {
    return null;
  }

  if (
    !/^\d+$/.test(movieId) ||
    !isDate(releaseDate) ||
    releaseMonth !== targetMonth ||
    parsedSource.protocol !== "https:" ||
    !Number.isFinite(verifiedTime) ||
    verificationAge < -5 * 60 * 1000 ||
    verificationAge > FEED_VERIFICATION_MAX_AGE_MS
  ) {
    return null;
  }

  const allowedStreamingProviders = new Set(
    (
      process.env.MONTHLY_WATCHLIST_STREAMING_PROVIDERS ??
      "Netflix,Disney+,Hulu,Max,Prime Video,Apple TV+,Paramount+,Peacock"
    )
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );

  if (category === "digital" && availabilityType === "rent_buy" && !provider) {
    return { ...item, availabilityType, category, movieId, provider, releaseDate, sourceUrl, verifiedAt };
  }

  if (
    category === "subscription_streaming" &&
    availabilityType === "subscription" &&
    provider &&
    allowedStreamingProviders.has(provider.toLowerCase())
  ) {
    return { ...item, availabilityType, category, movieId, provider, releaseDate, sourceUrl, verifiedAt };
  }

  return null;
}

async function getReleaseFeed(monthKey: string) {
  const feedUrl = process.env.MONTHLY_WATCHLIST_RELEASE_FEED_URL;

  if (!feedUrl) {
    throw new Error(
      "MONTHLY_WATCHLIST_RELEASE_FEED_URL is required; campaign selection will not guess availability dates."
    );
  }

  const url = new URL(feedUrl);
  url.searchParams.set("month", monthKey.slice(0, 7));
  url.searchParams.set("region", "US");
  const token = process.env.MONTHLY_WATCHLIST_FEED_TOKEN;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Release feed request failed with ${response.status}.`);
  }

  const data = (await response.json()) as { items?: ReleaseFeedItem[] };
  const now = new Date();
  const seen = new Set<string>();
  const items = (data.items ?? [])
    .slice(0, MAX_FEED_ITEMS)
    .map((item) => normalizedFeedItem(item, monthKey, now))
    .filter((item): item is ReleaseFeedItem & {
      availabilityType: "rent_buy" | "subscription";
      category: MonthlyWatchlistCategory;
      movieId: string;
      provider: string | null;
      releaseDate: string;
      sourceUrl: string;
      verifiedAt: string;
    } => Boolean(item))
    .filter((item) => {
      const key = `${item.category}:${item.movieId}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (items.length === 0) {
    throw new Error("The release feed contained no verified eligible movies.");
  }

  return items;
}

async function getTmdbMovie(movieId: string) {
  const token = process.env.TMDB_API_TOKEN;

  if (!token) {
    throw new Error("TMDB_API_TOKEN is required for campaign verification.");
  }

  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${encodeURIComponent(movieId)}?language=en-US`,
    {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  if (!response.ok) return null;
  return response.json() as Promise<TmdbCampaignMovie>;
}

async function selectMovies(monthKey: string) {
  const feedItems = await getReleaseFeed(monthKey);
  const enriched = await Promise.all(
    feedItems.map(async (item) => {
      const movie = await getTmdbMovie(item.movieId);
      const posterPath = tmdbImagePath(movie?.poster_path);

      if (!movie?.title || !posterPath || String(movie.id) !== item.movieId) {
        return null;
      }

      const feedScore = Number.isFinite(item.rankingScore)
        ? Math.min(Math.max(Number(item.rankingScore), 0), 100)
        : 0;
      const rankingScore =
        feedScore * 1000 +
        Math.max(movie.popularity ?? 0, 0) +
        Math.log10(Math.max(movie.vote_count ?? 0, 1)) * 10;

      return {
        availabilityType: item.availabilityType,
        category: item.category,
        displayOrder: 0,
        movieId: item.movieId,
        movieTitle: movie.title,
        posterPath,
        provider: item.provider,
        rankingScore,
        releaseDate: item.releaseDate,
        sourceUrl: item.sourceUrl,
        verifiedAt: item.verifiedAt,
      } satisfies MonthlyWatchlistMovie;
    })
  );
  const candidates = enriched
    .filter((movie): movie is MonthlyWatchlistMovie => Boolean(movie))
    .sort((a, b) => b.rankingScore - a.rankingScore);
  const selectedIds = new Set<string>();

  return (["digital", "subscription_streaming"] as const).flatMap((category) =>
    candidates
      .filter((movie) => movie.category === category && !selectedIds.has(movie.movieId))
      .slice(0, MAX_ITEMS_PER_SECTION)
      .map((movie, index) => {
        selectedIds.add(movie.movieId);
        return { ...movie, displayOrder: index + 1 };
      })
  );
}

function mapMovie(row: CampaignMovieRow): MonthlyWatchlistMovie {
  return {
    availabilityType: row.availability_type,
    category: row.category,
    displayOrder: row.display_order,
    movieId: row.movie_id,
    movieTitle: row.movie_title,
    posterPath: row.poster_path,
    provider: row.provider,
    rankingScore: Number(row.ranking_score),
    releaseDate: row.release_date,
    sourceUrl: row.source_url,
    verifiedAt: row.verified_at,
  };
}

async function campaignByMonth(monthKey: string) {
  const rows = await supabaseRest<CampaignRow[]>(
    `/monthly_watchlists?month_key=eq.${monthKey}&select=*&limit=1`
  );
  return rows[0] ?? null;
}

async function campaignMovies(watchlistId: string) {
  const rows = await supabaseRest<CampaignMovieRow[]>(
    `/monthly_watchlist_movies?watchlist_id=eq.${watchlistId}&select=*&order=category.asc,display_order.asc`
  );
  return rows.map(mapMovie);
}

async function saveCampaignFailure(monthKey: string, error: unknown) {
  const { month, year } = monthParts(monthKey);
  const message = error instanceof Error ? error.message : String(error);

  await supabaseRest<CampaignRow[]>(
    "/monthly_watchlists?on_conflict=month_key",
    {
      body: JSON.stringify({
        error_message: message.slice(0, 1000),
        month,
        month_key: monthKey,
        preview_text: PREVIEW_TEXT,
        status: "failed",
        subject: monthlyWatchlistSubject(month),
        year,
      }),
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      method: "POST",
    }
  );
}

export async function generateMonthlyWatchlist(
  monthKey: string,
  options: { finalize: boolean }
) {
  const { month, year } = monthParts(monthKey);
  const existing = await campaignByMonth(monthKey);

  if (existing?.status === "sent" || existing?.status === "sending") {
    throw new Error(`Campaign cannot be regenerated while ${existing.status}.`);
  }

  try {
    const movies = await selectMovies(monthKey);

    if (movies.length === 0) {
      throw new Error("No verified campaign movies remained after TMDB validation.");
    }

    const campaigns = await supabaseRest<CampaignRow[]>(
      "/monthly_watchlists?on_conflict=month_key",
      {
        body: JSON.stringify({
          error_message: null,
          finalized_at: options.finalize ? new Date().toISOString() : null,
          generated_at: new Date().toISOString(),
          month,
          month_key: monthKey,
          preview_text: PREVIEW_TEXT,
          status: options.finalize ? "ready" : "draft",
          subject: monthlyWatchlistSubject(month),
          year,
        }),
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        method: "POST",
      }
    );
    const campaign = campaigns[0];

    if (!campaign) throw new Error("Campaign could not be saved.");

    await supabaseRest<unknown>(
      `/monthly_watchlist_movies?watchlist_id=eq.${campaign.id}`,
      { method: "DELETE" }
    );
    await supabaseRest<CampaignMovieRow[]>("/monthly_watchlist_movies", {
      body: JSON.stringify(
        movies.map((movie) => ({
          availability_type: movie.availabilityType,
          category: movie.category,
          display_order: movie.displayOrder,
          movie_id: movie.movieId,
          movie_title: movie.movieTitle,
          poster_path: movie.posterPath,
          provider: movie.provider,
          ranking_score: movie.rankingScore,
          release_date: movie.releaseDate,
          source_url: movie.sourceUrl,
          verified_at: movie.verifiedAt,
          watchlist_id: campaign.id,
        }))
      ),
      headers: { Prefer: "return=representation" },
      method: "POST",
    });

    return { campaign, movies };
  } catch (error) {
    await saveCampaignFailure(monthKey, error).catch(() => undefined);
    throw error;
  }
}

function unsubscribeSecret() {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("EMAIL_UNSUBSCRIBE_SECRET must contain at least 32 characters.");
  }

  return secret;
}

export function createMonthlyUnsubscribeToken(userId: string) {
  const signature = createHmac("sha256", unsubscribeSecret())
    .update(userId)
    .digest("base64url");
  return `${userId}.${signature}`;
}

export function verifyMonthlyUnsubscribeToken(token: string) {
  const separator = token.lastIndexOf(".");
  const userId = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  if (!/^[0-9a-f-]{36}$/i.test(userId) || !signature) return null;

  const expected = createHmac("sha256", unsubscribeSecret())
    .update(userId)
    .digest();
  let supplied: Buffer;

  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }

  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
    ? userId
    : null;
}

async function authUsers() {
  const config = getSupabaseConfig();
  const users: AuthUser[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(
      `${config.authUrl}/admin/users?page=${page}&per_page=1000`,
      {
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) throw new Error("Could not load eligible email users.");
    const data = (await response.json()) as { users?: AuthUser[] };
    const pageUsers = data.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < 1000) break;
  }

  return users;
}

async function prepareRecipients(watchlistId: string) {
  const [profiles, users, suppressions] = await Promise.all([
    supabaseRest<{ user_id: string }[]>(
      "/profiles?email_monthly_watchlist=eq.true&select=user_id"
    ),
    authUsers(),
    supabaseRest<{ email: string }[]>(
      "/monthly_watchlist_suppressions?select=email"
    ),
  ]);
  const eligibleIds = new Set(profiles.map((profile) => profile.user_id));
  const suppressed = new Set(suppressions.map((row) => row.email.toLowerCase()));
  const recipients = users
    .filter(
      (user) =>
        eligibleIds.has(user.id) &&
        user.email_confirmed_at &&
        user.email &&
        !suppressed.has(user.email.toLowerCase())
    )
    .map((user) => ({
      email: user.email,
      status: "pending",
      user_id: user.id,
      watchlist_id: watchlistId,
    }));

  if (recipients.length) {
    await supabaseRest<RecipientRow[]>(
      "/monthly_watchlist_recipients?on_conflict=watchlist_id,user_id",
      {
        body: JSON.stringify(recipients),
        headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
        method: "POST",
      }
    );
  }

  return supabaseRest<RecipientRow[]>(
    `/monthly_watchlist_recipients?watchlist_id=eq.${watchlistId}&status=eq.pending&select=*`
  );
}

async function claimRecipient(recipientId: string) {
  const rows = await supabaseRest<RecipientRow[]>(
    `/monthly_watchlist_recipients?id=eq.${recipientId}&status=eq.pending`,
    {
      body: JSON.stringify({ status: "sending", attempts: 1 }),
      headers: { Prefer: "return=representation" },
      method: "PATCH",
    }
  );
  return rows[0] ?? null;
}

async function markCampaignSendFailure(campaignId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  await supabaseRest<unknown>(`/monthly_watchlists?id=eq.${campaignId}`, {
    body: JSON.stringify({
      error_message: message.slice(0, 1000),
      status: "failed",
    }),
    method: "PATCH",
  });
}

async function sendEmail(input: {
  campaign: CampaignRow;
  movies: MonthlyWatchlistMovie[];
  recipient: RecipientRow;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL are required.");
  }

  const token = createMonthlyUnsubscribeToken(input.recipient.user_id);
  const unsubscribeUrl = absoluteUrl(
    `/unsubscribe/monthly-watchlist?token=${encodeURIComponent(token)}`
  );
  const oneClickUnsubscribeUrl = absoluteUrl(
    `/api/email/monthly-watchlist/unsubscribe?token=${encodeURIComponent(token)}`
  );
  const email = renderMonthlyWatchlistEmail({
    month: input.campaign.month,
    movies: input.movies,
    sendDate: easternDateKey(new Date()),
    unsubscribeUrl,
    year: input.campaign.year,
  });
  const response = await fetch(RESEND_API_URL, {
    body: JSON.stringify({
      from,
      headers: {
        "List-Unsubscribe": `<${oneClickUnsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: email.html,
      subject: email.subject,
      text: email.text,
      to: input.recipient.email,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `monthly-watchlist-${input.campaign.month_key}-${input.recipient.user_id}`,
    },
    method: "POST",
  });
  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };

  if (!response.ok || !body.id) {
    throw new Error(body.message ?? `Resend request failed (${response.status}).`);
  }

  return body.id;
}

export async function sendMonthlyWatchlist(monthKey: string) {
  const campaign = await campaignByMonth(monthKey);

  if (!campaign || campaign.status !== "ready") {
    throw new Error("Campaign must be finalized and ready before sending.");
  }

  const claimedCampaigns = await supabaseRest<CampaignRow[]>(
    `/monthly_watchlists?id=eq.${campaign.id}&status=eq.ready`,
    {
      body: JSON.stringify({ status: "sending" }),
      headers: { Prefer: "return=representation" },
      method: "PATCH",
    }
  );

  if (!claimedCampaigns[0]) {
    throw new Error("Campaign is already being processed.");
  }

  let movies: MonthlyWatchlistMovie[];

  try {
    movies = await campaignMovies(campaign.id);
  } catch (error) {
    await markCampaignSendFailure(campaign.id, error).catch(() => undefined);
    throw error;
  }

  if (!movies.length) {
    await markCampaignSendFailure(campaign.id, "Campaign has no verified movies.");
    throw new Error("Campaign has no verified movies.");
  }

  let recipients: RecipientRow[];

  try {
    recipients = await prepareRecipients(campaign.id);
  } catch (error) {
    await markCampaignSendFailure(campaign.id, error).catch(() => undefined);
    throw error;
  }

  if (!recipients.length) {
    await markCampaignSendFailure(
      campaign.id,
      "Campaign has no eligible unsuppressed recipients."
    );
    throw new Error("Campaign has no eligible unsuppressed recipients.");
  }

  let successfulSends = 0;
  let failedSends = 0;

  for (const recipient of recipients) {
    const claimed = await claimRecipient(recipient.id);
    if (!claimed) continue;

    try {
      const providerEmailId = await sendEmail({ campaign, movies, recipient: claimed });
      successfulSends += 1;
      await supabaseRest<unknown>(
        `/monthly_watchlist_recipients?id=eq.${claimed.id}`,
        {
          body: JSON.stringify({
            provider_email_id: providerEmailId,
            sent_at: new Date().toISOString(),
            status: "sent",
          }),
          method: "PATCH",
        }
      );
    } catch (error) {
      failedSends += 1;
      await supabaseRest<unknown>(
        `/monthly_watchlist_recipients?id=eq.${claimed.id}`,
        {
          body: JSON.stringify({
            last_error: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
            status: "failed",
          }),
          method: "PATCH",
        }
      );
    }
  }

  await supabaseRest<unknown>(`/monthly_watchlists?id=eq.${campaign.id}`, {
    body: JSON.stringify({
      error_message:
        failedSends === 0 ? null : `${failedSends} recipient sends failed.`,
      failed_sends: failedSends,
      recipient_count: recipients.length,
      sent_at: failedSends === 0 ? new Date().toISOString() : null,
      status: failedSends === 0 ? "sent" : "failed",
      successful_sends: successfulSends,
    }),
    method: "PATCH",
  });

  return { failedSends, recipientCount: recipients.length, successfulSends };
}

export async function getMonthlyWatchlistSnapshot(monthKey: string) {
  monthParts(monthKey);
  const campaign = await campaignByMonth(monthKey);
  if (!campaign) return null;
  const movies = await campaignMovies(campaign.id);
  const preview = renderMonthlyWatchlistEmail({
    month: campaign.month,
    movies,
    sendDate: campaign.month_key,
    unsubscribeUrl: "#unsubscribe-preview",
    year: campaign.year,
  });

  return {
    campaign: {
      errorMessage: campaign.error_message,
      failedSends: campaign.failed_sends,
      finalizedAt: campaign.finalized_at,
      generatedAt: campaign.generated_at,
      id: campaign.id,
      month: campaign.month,
      monthKey: campaign.month_key,
      previewText: campaign.preview_text,
      recipientCount: campaign.recipient_count,
      sentAt: campaign.sent_at,
      status: campaign.status,
      subject: campaign.subject,
      successfulSends: campaign.successful_sends,
      year: campaign.year,
    },
    movies,
    previewHtml: preview.html,
  } satisfies MonthlyWatchlistSnapshot;
}

export async function getAuthorizedAdmin(accessToken: string) {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.authUrl}/user`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  const user = (await response.json()) as AuthUser;
  const ids = new Set(
    (process.env.POPSCORE_ADMIN_USER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean)
  );
  const emails = new Set(
    (process.env.POPSCORE_ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );

  return ids.has(user.id) || (user.email && emails.has(user.email.toLowerCase()))
    ? user
    : null;
}

async function sendMonthlyWatchlistTest(
  campaign: CampaignRow,
  movies: MonthlyWatchlistMovie[],
  admin: AuthUser
) {
  const testEmail = process.env.MONTHLY_WATCHLIST_TEST_EMAIL ?? admin.email;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!testEmail || !apiKey || !from) {
    throw new Error("Test recipient or Resend configuration is missing.");
  }

  const email = renderMonthlyWatchlistEmail({
    month: campaign.month,
    movies,
    sendDate: campaign.month_key,
    unsubscribeUrl: absoluteUrl("/profile/edit"),
    year: campaign.year,
  });
  const response = await fetch(RESEND_API_URL, {
    body: JSON.stringify({
      from,
      html: email.html,
      subject: `[TEST] ${email.subject}`,
      text: email.text,
      to: testEmail,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `monthly-watchlist-test-${campaign.month_key}-${Date.now()}`,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return { testEmail };
}

export async function sendMonthlyWatchlistTestForMonth(
  monthKey: string,
  admin: AuthUser
) {
  const campaign = await campaignByMonth(monthKey);

  if (!campaign) throw new Error("Generate the campaign before sending a test.");
  const movies = await campaignMovies(campaign.id);
  if (!movies.length) throw new Error("Campaign has no movies to preview.");

  return sendMonthlyWatchlistTest(campaign, movies, admin);
}

export async function suppressMonthlyWatchlistEmail(email: string, reason: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  await supabaseRest<unknown>(
    "/monthly_watchlist_suppressions?on_conflict=email",
    {
      body: JSON.stringify({ email: normalizedEmail, reason }),
      headers: { Prefer: "resolution=merge-duplicates" },
      method: "POST",
    }
  );
}

export async function unsubscribeMonthlyWatchlistUser(userId: string) {
  await supabaseRest<unknown>(`/profiles?user_id=eq.${userId}`, {
    body: JSON.stringify({ email_monthly_watchlist: false }),
    method: "PATCH",
  });
}
