import { easternCalendarParts } from "@/lib/monthly-watchlist";
import { sendYearlyRecaps } from "@/lib/yearly-recap";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (process.env.YEARLY_RECAP_ENABLED === "false") {
    return Response.json({ reason: "recap_disabled", skipped: true });
  }

  const easternDate = easternCalendarParts(new Date());
  if (easternDate.month !== 1 || easternDate.day !== 1) {
    return Response.json({ reason: "not_recap_day", skipped: true });
  }

  try {
    const result = await sendYearlyRecaps(easternDate.year - 1);
    return Response.json(result, { status: result.failed > 0 ? 500 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Yearly recap cron failed", { easternDate, message });
    return Response.json({ error: message }, { status: 500 });
  }
}
