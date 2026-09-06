import { expect, test } from "@playwright/test";
import {
  generateMonthlyWatchlist,
  monthKeyWithOffset,
  sendMonthlyWatchlist,
} from "@/lib/monthly-watchlist";

test("Monthly Watchlist workflow is persisted and sends each recipient once", async () => {
  const originalFetch = global.fetch;
  const monthKey = monthKeyWithOffset(new Date(), 1);
  const month = Number(monthKey.slice(5, 7));
  const year = Number(monthKey.slice(0, 4));
  const verifiedAt = new Date().toISOString();
  let campaign: Record<string, unknown> | null = null;
  let movies: Record<string, unknown>[] = [];
  let recipient: Record<string, unknown> = {
    email: "movie-fan@example.com",
    id: "recipient-1",
    status: "pending",
    user_id: "11111111-1111-4111-8111-111111111111",
  };
  let resendRequests = 0;

  process.env.SUPABASE_URL = "https://popscore-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  process.env.TMDB_API_TOKEN = "test-tmdb-token";
  process.env.MONTHLY_WATCHLIST_RELEASE_FEED_URL =
    "https://release-feed.example/monthly";
  process.env.EMAIL_UNSUBSCRIBE_SECRET = "a".repeat(32);
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.RESEND_FROM_EMAIL = "PopScore <watchlist@example.com>";

  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      headers: { "Content-Type": "application/json" },
      status,
    });
  const body = (init?: RequestInit) =>
    init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.startsWith("https://release-feed.example/monthly")) {
      return json({
        items: [
          {
            availabilityType: "rent_buy",
            category: "digital",
            movieId: 101,
            provider: null,
            rankingScore: 90,
            releaseDate: `${monthKey.slice(0, 7)}-01`,
            sourceUrl: "https://release-source.example/movie/101",
            verifiedAt,
          },
          {
            availabilityType: "subscription",
            category: "subscription_streaming",
            movieId: 202,
            provider: "Netflix",
            rankingScore: 80,
            releaseDate: `${monthKey.slice(0, 7)}-18`,
            sourceUrl: "https://release-source.example/movie/202",
            verifiedAt,
          },
        ],
      });
    }

    if (url.includes("api.themoviedb.org/3/movie/101")) {
      return json({ id: 101, popularity: 100, poster_path: "/101.jpg", title: "Digital Movie", vote_count: 500 });
    }

    if (url.includes("api.themoviedb.org/3/movie/202")) {
      return json({ id: 202, popularity: 80, poster_path: "/202.jpg", title: "Streaming Movie", vote_count: 400 });
    }

    if (url.includes("/auth/v1/admin/users")) {
      return json({
        users: [
          {
            email: "movie-fan@example.com",
            email_confirmed_at: verifiedAt,
            id: recipient.user_id,
          },
        ],
      });
    }

    if (url === "https://api.resend.com/emails") {
      resendRequests += 1;
      return json({ id: "resend-message-1" });
    }

    if (url.includes("/rest/v1/monthly_watchlists?month_key=")) {
      return json(campaign ? [campaign] : []);
    }

    if (url.includes("/rest/v1/monthly_watchlists?on_conflict=")) {
      campaign = {
        error_message: null,
        failed_sends: 0,
        finalized_at: null,
        generated_at: verifiedAt,
        id: "campaign-1",
        month,
        month_key: monthKey,
        preview_text: "preview",
        recipient_count: 0,
        sent_at: null,
        status: "draft",
        subject: "subject",
        successful_sends: 0,
        year,
        ...body(init),
      };
      return json([campaign]);
    }

    if (url.includes("/rest/v1/monthly_watchlist_movies?watchlist_id=") && method === "DELETE") {
      movies = [];
      return new Response(null, { status: 204 });
    }

    if (url.endsWith("/rest/v1/monthly_watchlist_movies") && method === "POST") {
      movies = JSON.parse(String(init?.body)) as Record<string, unknown>[];
      return json(movies);
    }

    if (url.includes("/rest/v1/monthly_watchlist_movies?watchlist_id=")) {
      return json(movies);
    }

    if (url.includes("/rest/v1/monthly_watchlists?id=") && url.includes("status=eq.ready")) {
      if (campaign?.status !== "ready") return json([]);
      campaign = { ...campaign, status: "sending" };
      return json([campaign]);
    }

    if (url.includes("/rest/v1/monthly_watchlists?id=") && method === "PATCH") {
      campaign = { ...campaign, ...body(init) };
      return new Response(null, { status: 204 });
    }

    if (url.includes("/rest/v1/profiles?email_monthly_watchlist=eq.true")) {
      return json([{ user_id: recipient.user_id }]);
    }

    if (url.includes("/rest/v1/monthly_watchlist_suppressions?select=")) {
      return json([]);
    }

    if (url.includes("/rest/v1/monthly_watchlist_recipients?on_conflict=")) {
      return json([recipient]);
    }

    if (url.includes("/rest/v1/monthly_watchlist_recipients?watchlist_id=")) {
      return json(recipient.status === "pending" ? [recipient] : []);
    }

    if (url.includes("/rest/v1/monthly_watchlist_recipients?id=") && url.includes("status=eq.pending")) {
      if (recipient.status !== "pending") return json([]);
      recipient = { ...recipient, status: "sending" };
      return json([recipient]);
    }

    if (url.includes("/rest/v1/monthly_watchlist_recipients?id=") && method === "PATCH") {
      recipient = { ...recipient, ...body(init) };
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected test request: ${method} ${url}`);
  }) as typeof fetch;

  try {
    const generated = await generateMonthlyWatchlist(monthKey, { finalize: true });
    expect(generated.movies).toHaveLength(2);

    const sent = await sendMonthlyWatchlist(monthKey);
    expect(sent).toEqual({ failedSends: 0, recipientCount: 1, successfulSends: 1 });
    expect(resendRequests).toBe(1);
    expect((campaign as Record<string, unknown> | null)?.status).toBe("sent");
    expect(recipient.status).toBe("sent");

    await expect(sendMonthlyWatchlist(monthKey)).rejects.toThrow(
      "Campaign must be finalized and ready before sending."
    );
    expect(resendRequests).toBe(1);
  } finally {
    global.fetch = originalFetch;
  }
});
