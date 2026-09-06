import { createHash, timingSafeEqual } from "node:crypto";
import { renderMonthlyWatchlistEmail, type MonthlyWatchlistMovie } from "@/lib/monthly-watchlist-email";
import { absoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const expectedTokenHash = "bb669ecd6a52e99ed7ba043ca1aa476a2bd136ff85dd3e2100160e3397036db7";
const expectedEmailHash = "77b0cc9b62aa0f5bd83dd5797cee407fe613fb3876f1a2057ab46720c293d953";
const sampleMovieIds = ["603", "550", "155", "157336"] as const;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function matchesHash(value: string, expectedHash: string) {
  const actual = Buffer.from(sha256(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function sampleMovies(token: string): Promise<MonthlyWatchlistMovie[]> {
  const results = await Promise.all(
    sampleMovieIds.map(async (id) => {
      const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-US`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not load sample movie artwork.");
      return response.json() as Promise<{ id: number; poster_path: string | null; title: string }>;
    })
  );
  const dates = ["2026-09-01", "2026-09-18", "2026-09-01", "2026-09-23"];

  return results.map((movie, index) => {
    if (!movie.poster_path) throw new Error("Sample movie artwork is unavailable.");
    const digital = index < 2;
    return {
      availabilityType: digital ? "rent_buy" : "subscription",
      category: digital ? "digital" : "subscription_streaming",
      displayOrder: (index % 2) + 1,
      movieId: String(movie.id),
      movieTitle: movie.title,
      posterPath: movie.poster_path,
      provider: digital ? null : index === 2 ? "Netflix" : "Max",
      rankingScore: 100 - index,
      releaseDate: dates[index],
      sourceUrl: absoluteUrl("/"),
      verifiedAt: new Date().toISOString(),
    };
  });
}

export async function POST(request: Request) {
  const token = request.headers.get("x-preview-token") ?? "";
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";

  if (!matchesHash(token, expectedTokenHash) || !matchesHash(email, expectedEmailHash)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const tmdbToken = process.env.TMDB_API_TOKEN;
  if (!resendApiKey || !from || !tmdbToken) {
    return Response.json({ error: "Production email or movie configuration is missing." }, { status: 503 });
  }

  const movies = await sampleMovies(tmdbToken);
  const preview = renderMonthlyWatchlistEmail({
    month: 9,
    movies,
    previewMode: true,
    sendDate: "2026-09-01",
    unsubscribeUrl: absoluteUrl("/profile/edit"),
    year: 2026,
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": "monthly-watchlist-design-preview-2026-09-05",
    },
    body: JSON.stringify({
      from,
      html: preview.html,
      subject: `[TEST PREVIEW] ${preview.subject}`,
      text: preview.text,
      to: email,
    }),
  });

  const result = await response.text();
  if (!response.ok) {
    console.error("Monthly Watchlist preview send failed.", { status: response.status });
    return Response.json({ error: result || "Email provider rejected the preview." }, { status: 502 });
  }

  return new Response(result, {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
