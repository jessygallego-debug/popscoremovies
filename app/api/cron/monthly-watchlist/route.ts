import {
  easternCalendarParts,
  generateMonthlyWatchlist,
  getMonthlyWatchlistSnapshot,
  monthKeyWithOffset,
  sendMonthlyWatchlist,
} from "@/lib/monthly-watchlist";
import { collectMovieReleases } from "@/lib/releases/collector";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(
    cronSecret &&
    request.headers.get("authorization") === `Bearer ${cronSecret}`,
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
    const daysInMonth = new Date(
      Date.UTC(easternDate.year, easternDate.month, 0),
    ).getUTCDate();
    if (easternDate.day >= daysInMonth - 2) {
      const monthKey = monthKeyWithOffset(now, 1);
      const result = await generateMonthlyWatchlist(monthKey, {
        finalize: true,
      });

      return Response.json({
        generated: result.movies.length,
        monthKey,
        status: "ready",
      });
    }

    if (easternDate.day === 1) {
      const monthKey = monthKeyWithOffset(now, 0);
      if (
        monthKey < (process.env.MONTHLY_WATCHLIST_START_MONTH ?? "2026-11-01")
      ) {
        return Response.json({ skipped: true, reason: "before_start_month" });
      }
      const existing = await getMonthlyWatchlistSnapshot(monthKey);

      if (existing?.campaign.status === "sent") {
        return Response.json({
          monthKey,
          reason: "already_sent",
          skipped: true,
        });
      }

      if (existing?.campaign.status === "sending") {
        return Response.json({
          monthKey,
          reason: "send_in_progress",
          skipped: true,
        });
      }

      if (process.env.MONTHLY_RELEASE_COLLECTOR_ENABLED === "true")
        await collectMovieReleases();
      const final = await generateMonthlyWatchlist(monthKey, {
        finalize: true,
      });
      const minimum = Number(
        process.env.MONTHLY_WATCHLIST_MIN_AUTOMATIC_PICKS ?? "4",
      );
      if (!Number.isInteger(minimum) || minimum < 1 || minimum > 5)
        throw new Error("Invalid automatic campaign minimum.");
      const coverage = ["digital", "subscription_streaming"].map(
        (category) => ({
          category,
          count: final.movies.filter((movie) => movie.category === category)
            .length,
        }),
      );
      if (coverage.some((section) => section.count < minimum)) {
        return Response.json({
          monthKey,
          skipped: true,
          reason: "insufficient_trustworthy_coverage",
          coverage,
        });
      }
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
