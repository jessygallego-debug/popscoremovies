import { getAuthenticatedCommunityOverview } from "@/lib/community-overview";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) {
    return Response.json(
      { error: "Authentication is required." },
      { status: 401 }
    );
  }

  try {
    const overview = await getAuthenticatedCommunityOverview(accessToken);

    return Response.json(overview, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Authenticated community overview failed",
        error: error instanceof Error ? error.message : String(error),
      })
    );

    return Response.json(
      { error: "Could not load the Community page." },
      { status: 502 }
    );
  }
}
