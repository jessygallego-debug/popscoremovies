import {
  generateMonthlyWatchlist,
  getAuthorizedAdmin,
  getMonthlyWatchlistSnapshot,
  monthKeyWithOffset,
  sendMonthlyWatchlistTestForMonth,
} from "@/lib/monthly-watchlist";
import {
  releaseCandidateReport,
  setReleaseOverride,
} from "@/lib/releases/candidates";
import { collectMovieReleases } from "@/lib/releases/collector";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
}

async function authorizedAdmin(request: Request) {
  const token = bearerToken(request);
  return token ? getAuthorizedAdmin(token) : null;
}

function requestedMonth(request: Request) {
  return (
    new URL(request.url).searchParams.get("month") ??
    monthKeyWithOffset(new Date(), 1)
  );
}

export async function GET(request: Request) {
  if (!(await authorizedAdmin(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const monthKey = requestedMonth(request);
    return Response.json({
      monthKey,
      snapshot: await getMonthlyWatchlistSnapshot(monthKey),
      releases:
        process.env.MONTHLY_RELEASE_COLLECTOR_ENABLED === "true"
          ? await releaseCandidateReport(monthKey)
          : null,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const admin = await authorizedAdmin(request);

  if (!admin) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?:
      | "finalize"
      | "generate"
      | "send_test"
      | "collect"
      | "approve"
      | "exclude"
      | "replace";
    monthKey?: string;
    eventId?: string;
    replacementEventId?: string;
  } | null;
  const monthKey = body?.monthKey ?? monthKeyWithOffset(new Date(), 1);

  try {
    if (body?.action === "collect") {
      await collectMovieReleases();
    } else if (
      body?.action === "approve" ||
      body?.action === "exclude" ||
      body?.action === "replace"
    ) {
      const existing = await getMonthlyWatchlistSnapshot(monthKey);
      if (
        existing?.campaign.status === "sent" ||
        existing?.campaign.status === "sending"
      )
        throw new Error("This campaign is locked for delivery.");
      if (!body.eventId) throw new Error("A candidate is required.");
      if (body.action === "replace") {
        if (!body.replacementEventId)
          throw new Error("Choose a replacement candidate.");
        const report = await releaseCandidateReport(monthKey);
        const original = report.candidates.find(
          (c) => c.eventId === body.eventId,
        );
        const replacement = report.candidates.find(
          (c) => c.eventId === body.replacementEventId,
        );
        if (
          !original ||
          !replacement?.eligible ||
          original.category !== replacement.category
        )
          throw new Error(
            "Replacement must be an eligible candidate in the same section.",
          );
        await setReleaseOverride(monthKey, body.replacementEventId, "approve");
      }
      await setReleaseOverride(
        monthKey,
        body.eventId,
        body.action === "approve" ? "approve" : "exclude",
      );
      await generateMonthlyWatchlist(monthKey, { finalize: false });
    } else if (body?.action === "generate" || body?.action === "finalize") {
      await generateMonthlyWatchlist(monthKey, {
        finalize: body.action === "finalize",
      });
    } else if (body?.action === "send_test") {
      await sendMonthlyWatchlistTestForMonth(monthKey, admin);
    } else {
      return Response.json({ error: "Invalid action." }, { status: 400 });
    }

    return Response.json({
      monthKey,
      snapshot: await getMonthlyWatchlistSnapshot(monthKey),
      releases:
        process.env.MONTHLY_RELEASE_COLLECTOR_ENABLED === "true"
          ? await releaseCandidateReport(monthKey)
          : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Monthly Watchlist admin action failed", {
      action: body?.action,
      message,
      monthKey,
    });
    return Response.json({ error: message }, { status: 500 });
  }
}
