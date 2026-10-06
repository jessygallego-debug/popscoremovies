import { collectMovieReleases } from "@/lib/releases/collector";
import { releaseCandidateReport } from "@/lib/releases/candidates";
import {
  easternCalendarParts,
  monthKeyWithOffset,
  generateMonthlyWatchlist,
  getMonthlyWatchlistSnapshot,
} from "@/lib/monthly-watchlist";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  if (process.env.MONTHLY_RELEASE_COLLECTOR_ENABLED !== "true")
    return Response.json({ skipped: true, reason: "collector_disabled" });
  try {
    const params = new URL(request.url).searchParams;
    const report = await collectMovieReleases({
      start: params.get("start") ?? undefined,
      end: params.get("end") ?? undefined,
    });
    const months = params.get("months")?.split(",") ?? [];
    if (months.length > 2) throw new Error("At most two validation months.");
    const validation = await Promise.all(
      months.map((month) => releaseCandidateReport(month)),
    );
    const drafts = params.get("drafts") === "true" ? await Promise.all(months.map(async monthKey => {
      const draft = await generateMonthlyWatchlist(monthKey, {finalize:false});
      return {monthKey,picks:draft.movies.length};
    })) : [];
    let campaignRefresh: unknown = null;
    if (!params.has("start") && !params.has("end")) {
      const now = new Date(),
        parts = easternCalendarParts(now);
      const days = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
      const monthKey = monthKeyWithOffset(now, 1),
        existing = await getMonthlyWatchlistSnapshot(monthKey);
      if (
        parts.day >= days - 2 ||
        existing?.campaign.status === "ready" ||
        existing?.campaign.status === "draft"
      ) {
        try {
          const refreshed = await generateMonthlyWatchlist(monthKey, {
            finalize:
              parts.day >= days - 2 || existing?.campaign.status === "ready",
          });
          campaignRefresh = { monthKey, picks: refreshed.movies.length };
        } catch {
          campaignRefresh = {
            monthKey,
            error:
              "Insufficient trustworthy release coverage; campaign not finalized.",
          };
        }
      }
    }
    return Response.json({ report, validation, campaignRefresh, drafts });
  } catch {
    return Response.json(
      { error: "Release collection failed; previous evidence retained." },
      { status: 500 },
    );
  }
}
