import { createHmac, timingSafeEqual } from "node:crypto";
import { suppressMonthlyWatchlistEmail } from "@/lib/monthly-watchlist";

export const dynamic = "force-dynamic";

type ResendWebhookEvent = {
  data?: {
    to?: string[];
  };
  type?: string;
};

function verifyWebhook(request: Request, payload: string) {
  const id = request.headers.get("svix-id") ?? "";
  const timestamp = request.headers.get("svix-timestamp") ?? "";
  const signatures = request.headers.get("svix-signature") ?? "";
  const configuredSecret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const timestampSeconds = Number(timestamp);

  if (
    !id ||
    !timestamp ||
    !signatures ||
    !configuredSecret.startsWith("whsec_") ||
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > 5 * 60
  ) {
    return false;
  }

  let secret: Buffer;

  try {
    secret = Buffer.from(configuredSecret.slice(6), "base64");
  } catch {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${payload}`)
    .digest();

  return signatures.split(" ").some((candidate) => {
    const [, encoded] = candidate.split(",", 2);

    if (!encoded) return false;

    try {
      const supplied = Buffer.from(encoded, "base64");
      return supplied.length === expected.length && timingSafeEqual(supplied, expected);
    } catch {
      return false;
    }
  });
}

export async function POST(request: Request) {
  const payload = await request.text();

  if (!verifyWebhook(request, payload)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as ResendWebhookEvent;
  const suppressionReasons: Record<string, string> = {
    "email.bounced": "bounce",
    "email.complained": "spam_complaint",
    "email.suppressed": "provider_suppression",
  };
  const reason = event.type ? suppressionReasons[event.type] : null;

  if (reason) {
    await Promise.all(
      (event.data?.to ?? []).map((email) =>
        suppressMonthlyWatchlistEmail(email, reason)
      )
    );
  }

  return Response.json({ received: true });
}
