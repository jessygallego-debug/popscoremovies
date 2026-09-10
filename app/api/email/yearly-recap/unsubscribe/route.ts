import {
  unsubscribeYearlyRecapUser,
  verifyYearlyRecapUnsubscribeToken,
} from "@/lib/yearly-recap";

export const dynamic = "force-dynamic";

async function unsubscribe(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = url.searchParams.get("token") ?? body?.token ?? "";

  try {
    const userId = verifyYearlyRecapUnsubscribeToken(token);
    if (!userId) return Response.json({ error: "Invalid unsubscribe link." }, { status: 400 });
    await unsubscribeYearlyRecapUser(userId);
    return Response.json({ unsubscribed: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return unsubscribe(request);
}
