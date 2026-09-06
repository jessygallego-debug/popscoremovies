import {
  generateMonthlyWatchlist,
  getAuthorizedAdmin,
  getMonthlyWatchlistSnapshot,
  monthKeyWithOffset,
  sendMonthlyWatchlistTestForMonth,
} from "@/lib/monthly-watchlist";

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
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await authorizedAdmin(request);

  if (!admin) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: "finalize" | "generate" | "send_test";
    monthKey?: string;
  } | null;
  const monthKey = body?.monthKey ?? monthKeyWithOffset(new Date(), 1);

  try {
    if (body?.action === "generate" || body?.action === "finalize") {
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
