import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getYearlyMovieActivity } from "@/lib/movie-watch-stats";
import type { UserMovieRating, UserMovieWatch, UserMovieWatchType } from "@/lib/profile-store";
import { absoluteUrl } from "@/lib/site-url";
import { renderYearlyRecapEmail } from "@/lib/yearly-recap-email";

type AuthUser = { email?: string; email_confirmed_at?: string; id: string };
type ProfileRow = { user_id: string; username: string };
type DeliveryRow = { attempts: number; email: string; id: string; status: string; user_id: string };
type WatchRow = { created_at: string; id: string; movie_id: string; rating_id: string | null; runtime_minutes: number | null; updated_at: string; user_id: string; watched_date: string | null; watch_type: UserMovieWatchType };
type RatingRow = { created_at: string; genre: string; genre_names: string[] | null; id: string; movie_id: string; movie_title: string; popscore: number; poster_path: string | null; quick_reaction: UserMovieRating["quick_reaction"]; rating_source: UserMovieRating["ratingSource"]; ratings: Record<string, number>; release_date: string | null; review_comment: string | null; updated_at: string; user_id: string; weights: { key: string; weight: number }[] };

const RESEND_API_URL = "https://api.resend.com/emails";

function config() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase server configuration is missing.");
  const cleanUrl = url.replace(/\/$/, "");
  return { authUrl: `${cleanUrl}/auth/v1`, restUrl: `${cleanUrl}/rest/v1`, serviceRoleKey };
}

async function rest<T>(path: string, init: RequestInit = {}) {
  const server = config();
  const response = await fetch(`${server.restUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: server.serviceRoleKey, Authorization: `Bearer ${server.serviceRoleKey}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${await response.text().catch(() => "")}`);
  return response.status === 204 ? (null as T) : (response.json() as Promise<T>);
}

async function restPages<T>(path: string) {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let offset = 0; offset < 100_000; offset += pageSize) {
    const page = await rest<T[]>(path, { headers: { Range: `${offset}-${offset + pageSize - 1}` } });
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

function groupBy<T>(rows: T[], keyFor: (row: T) => string) {
  const grouped = new Map<string, T[]>();
  rows.forEach((row) => {
    const key = keyFor(row);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  });
  return grouped;
}

async function authUsers() {
  const server = config();
  const users: AuthUser[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${server.authUrl}/admin/users?page=${page}&per_page=1000`, { cache: "no-store", headers: { apikey: server.serviceRoleKey, Authorization: `Bearer ${server.serviceRoleKey}` } });
    if (!response.ok) throw new Error("Could not load eligible email users.");
    const rows = ((await response.json()) as { users?: AuthUser[] }).users ?? [];
    users.push(...rows);
    if (rows.length < 1000) break;
  }
  return users;
}

function unsubscribeSecret() {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32) throw new Error("EMAIL_UNSUBSCRIBE_SECRET must contain at least 32 characters.");
  return secret;
}

export function createYearlyRecapUnsubscribeToken(userId: string) {
  const signature = createHmac("sha256", unsubscribeSecret()).update(`yearly-recap:${userId}`).digest("base64url");
  return `${userId}.${signature}`;
}

export function verifyYearlyRecapUnsubscribeToken(token: string) {
  const separator = token.lastIndexOf(".");
  const userId = token.slice(0, separator);
  const suppliedText = token.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !suppliedText) return null;
  const expected = createHmac("sha256", unsubscribeSecret()).update(`yearly-recap:${userId}`).digest();
  try {
    const supplied = Buffer.from(suppliedText, "base64url");
    return supplied.length === expected.length && timingSafeEqual(supplied, expected) ? userId : null;
  } catch {
    return null;
  }
}

function mapWatch(row: WatchRow): UserMovieWatch {
  return { createdAt: row.created_at, id: row.id, movieId: row.movie_id, ratingId: row.rating_id, runtimeMinutes: row.runtime_minutes, updatedAt: row.updated_at, userId: row.user_id, watchedDate: row.watched_date, watchType: row.watch_type };
}

function mapRating(row: RatingRow): UserMovieRating {
  return { created_at: row.created_at, genre: row.genre, genreNames: row.genre_names ?? [], id: row.id, movieId: row.movie_id, movieTitle: row.movie_title, popscore: Number(row.popscore), posterPath: row.poster_path, quick_reaction: row.quick_reaction, ratingSource: row.rating_source, ratings: row.ratings, releaseDate: row.release_date, reviewComment: row.review_comment, updated_at: row.updated_at, user_id: row.user_id, weights: row.weights };
}

async function sendEmail(input: { activity: ReturnType<typeof getYearlyMovieActivity>; delivery: DeliveryRow; username: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL are required.");
  const token = createYearlyRecapUnsubscribeToken(input.delivery.user_id);
  const unsubscribeUrl = absoluteUrl(`/unsubscribe/yearly-recap?token=${encodeURIComponent(token)}`);
  const oneClickUrl = absoluteUrl(`/api/email/yearly-recap/unsubscribe?token=${encodeURIComponent(token)}`);
  const profileUrl = absoluteUrl(`/profile/${encodeURIComponent(input.username)}?tab=stats&activityYear=${input.activity.year}#movie-activity`);
  const email = renderYearlyRecapEmail({ activity: input.activity, profileUrl, unsubscribeUrl, username: input.username });
  const response = await fetch(RESEND_API_URL, {
    body: JSON.stringify({ from, headers: { "List-Unsubscribe": `<${oneClickUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, html: email.html, subject: email.subject, text: email.text, to: input.delivery.email }),
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `yearly-recap-${input.activity.year}-${input.delivery.user_id}` },
    method: "POST",
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok || !body.id) throw new Error(body.message ?? `Resend request failed (${response.status}).`);
  return body.id;
}

export async function sendYearlyRecaps(recapYear: number) {
  if (!Number.isInteger(recapYear) || recapYear < 2000 || recapYear > 2200) throw new Error("Invalid recap year.");
  const [profiles, users, suppressions, watchRows] = await Promise.all([
    restPages<ProfileRow>("/profiles?email_yearly_recap=eq.true&select=user_id,username"),
    authUsers(),
    restPages<{ email: string }>("/monthly_watchlist_suppressions?select=email"),
    restPages<WatchRow>(`/user_movie_watches?watched_date=gte.${recapYear}-01-01&watched_date=lte.${recapYear}-12-31&select=*`),
  ]);
  const activeUserIds = Array.from(new Set(watchRows.map((row) => row.user_id)));
  const ratingBatches: RatingRow[][] = [];
  for (let index = 0; index < activeUserIds.length; index += 100) {
    const userIds = activeUserIds.slice(index, index + 100).map(encodeURIComponent).join(",");
    ratingBatches.push(...[await restPages<RatingRow>(`/movie_ratings?user_id=in.(${userIds})&select=*`)]);
  }
  const ratingRows = ratingBatches.flat();
  const profileByUser = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const suppressed = new Set(suppressions.map((row) => row.email.trim().toLowerCase()));
  const watchesByUser = groupBy(watchRows.map(mapWatch), (watch) => watch.userId);
  const ratingsByUser = groupBy(ratingRows.map(mapRating), (rating) => rating.user_id);
  const eligible = users.flatMap((user) => {
    const profile = profileByUser.get(user.id);
    const email = user.email?.trim();
    const watches = watchesByUser.get(user.id) ?? [];
    return profile && email && user.email_confirmed_at && !suppressed.has(email.toLowerCase()) && watches.length > 0
      ? [{ activity: getYearlyMovieActivity({ ratings: ratingsByUser.get(user.id) ?? [], watches, year: recapYear }), email, profile, userId: user.id }]
      : [];
  });

  if (eligible.length > 0) {
    await rest<unknown>("/yearly_recap_deliveries?on_conflict=user_id,recap_year", {
      body: JSON.stringify(eligible.map((item) => ({ email: item.email, recap_year: recapYear, user_id: item.userId }))),
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      method: "POST",
    });
  }

  const pending = await rest<DeliveryRow[]>(`/yearly_recap_deliveries?recap_year=eq.${recapYear}&status=in.(pending,failed)&select=*`);
  let sent = 0;
  let failed = 0;
  for (const delivery of pending) {
    const item = eligible.find((candidate) => candidate.userId === delivery.user_id);
    if (!item) continue;
    const claimed = await rest<DeliveryRow[]>(`/yearly_recap_deliveries?id=eq.${delivery.id}&status=in.(pending,failed)`, { body: JSON.stringify({ attempts: delivery.attempts + 1, status: "sending" }), headers: { Prefer: "return=representation" }, method: "PATCH" });
    if (!claimed[0]) continue;
    try {
      const resendId = await sendEmail({ activity: item.activity, delivery, username: item.profile.username });
      await rest<unknown>(`/yearly_recap_deliveries?id=eq.${delivery.id}`, { body: JSON.stringify({ error_message: null, resend_email_id: resendId, sent_at: new Date().toISOString(), status: "sent" }), method: "PATCH" });
      sent += 1;
    } catch (error) {
      failed += 1;
      await rest<unknown>(`/yearly_recap_deliveries?id=eq.${delivery.id}`, { body: JSON.stringify({ error_message: (error instanceof Error ? error.message : String(error)).slice(0, 1000), status: "failed" }), method: "PATCH" });
    }
  }
  return { eligible: eligible.length, failed, recapYear, sent };
}

export async function unsubscribeYearlyRecapUser(userId: string) {
  await rest<unknown>(`/profiles?user_id=eq.${userId}`, { body: JSON.stringify({ email_yearly_recap: false }), method: "PATCH" });
}
