import {
  easternCalendarParts,
  generateMonthlyWatchlist,
  getMonthlyWatchlistSnapshot,
  monthKeyWithOffset,
  sendMonthlyWatchlist,
} from "@/lib/monthly-watchlist";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(
    cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (process.env.MONTHLY_WATCHLIST_ENABLED !== "true") {
    return Response.json({ reason: "campaign_disabled", skipped: true });
  }

  const now = new Date();
  const easternDate = easternCalendarParts(now);

  try {
    if (easternDate.day === 26) {
      const monthKey = monthKeyWithOffset(now, 1);
      const result = await generateMonthlyWatchlist(monthKey, {
        finalize: false,
      });

      return Response.json({
        generated: result.movies.length,
        monthKey,
        status: "draft",
      });
    }

    if (easternDate.day === 1) {
      const monthKey = monthKeyWithOffset(now, 0);
      const existing = await getMonthlyWatchlistSnapshot(monthKey);

      if (existing?.campaign.status === "sent") {
        return Response.json({ monthKey, reason: "already_sent", skipped: true });
      }

      if (existing?.campaign.status === "sending") {
        return Response.json({ monthKey, reason: "send_in_progress", skipped: true });
      }

      const final = await generateMonthlyWatchlist(monthKey, { finalize: true });
      const sendResult = await sendMonthlyWatchlist(monthKey);

      return Response.json({
        finalized: final.movies.length,
        monthKey,
        ...sendResult,
      });
    }

    return Response.json({ reason: "not_campaign_day", skipped: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Monthly Watchlist cron failed", {
      easternDate,
      message,
    });
    return Response.json({ error: message }, { status: 500 });
  }
}
