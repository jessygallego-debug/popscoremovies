import {
  relevanceScore,
  resolveReleaseEvidence,
  type ReleaseEvidence,
  type ReleaseMovie,
  type ReleaseSource,
} from "./policy";
import { releaseRest, upsertReleaseRows } from "./store";
import type { MonthlyWatchlistMovie } from "../monthly-watchlist-email";
import { selectMonthlyPicks } from "../monthly-watchlist-selection";
export async function releaseCandidateReport(monthKey: string) {
  if (
    !/^\d{4}-\d{2}-01$/.test(monthKey) ||
    !Number.isFinite(Date.parse(monthKey))
  )
    throw new Error("Invalid month.");
  const next = new Date(`${monthKey}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  // Include adjacent months so a competing delayed date can win before filtering to this month.
  const [events, sources, movies, providers, overrides] = await Promise.all([
    releaseRest<ReleaseEvidence[]>(
      "movie_release_events?status=eq.active&announced_release_date=not.is.null&limit=5000",
    ),
    releaseRest<ReleaseSource[]>("release_sources?enabled=eq.true"),
    releaseRest<ReleaseMovie[]>("release_movie_metadata?limit=5000"),
    releaseRest<
      { provider_id: string; provider_name: string; enabled: boolean }[]
    >("streaming_providers"),
    releaseRest<{ event_id: string; action: string }[]>(
      `monthly_release_overrides?month_key=eq.${monthKey}`,
    ),
  ]);
  const resolved = resolveReleaseEvidence(events, sources);
  const candidates = resolved
    .filter(
      (e) =>
        e.announced_release_date! >= monthKey &&
        e.announced_release_date! < next.toISOString().slice(0, 10),
    )
    .flatMap((event) => {
      const movie = movies.find(
        (m) => Number(m.tmdb_id) === Number(event.tmdb_id),
      );
      const provider = providers.find(
        (p) => p.provider_id === event.provider_id && p.enabled,
      );
      if (!movie?.poster_path || (event.provider_id && !provider)) return [];
      const excluded = event.evidence.some((e) =>
        overrides.some((o) => o.event_id === e.id && o.action === "exclude"),
      );
      const approved = event.evidence.some((e) =>
        overrides.some((o) => o.event_id === e.id && o.action === "approve"),
      );
      const score = relevanceScore(movie);
      return [
        {
          eventId: event.id,
          movieId: String(movie.tmdb_id),
          movieTitle: movie.title,
          posterPath: movie.poster_path,
          category: event.release_type,
          availabilityType:
            event.release_type === "digital"
              ? ("rent_buy" as const)
              : ("subscription" as const),
          releaseDate: event.announced_release_date!,
          provider: provider?.provider_name ?? null,
          rankingScore: score,
          sourceUrl: event.source_url,
          sourceName:
            sources.find((s) => s.source_id === event.source_id)?.name ??
            event.source_id,
          confidence: event.confidence,
          verifiedAt: event.verified_at,
          displayOrder: 0,
          excluded,
          approved,
          conflicting: event.conflicting,
          stale: event.stale,
          eligible:
            !excluded &&
            !event.stale &&
            event.confidence !== "LOW" &&
            (score >= 100 || approved),
          evidence: event.evidence,
        },
      ];
    });
  // Approval can make a verified title eligible, but does not affect its rank.
  const eligible = candidates
    .filter((c) => c.eligible)
    .sort((a, b) => b.rankingScore - a.rankingScore);
  const selected = selectMonthlyPicks(eligible);
  return {
    monthKey,
    candidates,
    selected,
    counts: {
      digital: candidates.filter((c) => c.category === "digital").length,
      streaming: candidates.filter(
        (c) => c.category === "subscription_streaming",
      ).length,
    },
    highMediumPercent: candidates.length
      ? Math.round(
          (candidates.filter((c) => c.confidence !== "LOW").length /
            candidates.length) *
            100,
        )
      : 0,
    conflicts: candidates
      .filter((c) => c.conflicting)
      .map((c) => ({ title: c.movieTitle, evidence: c.evidence })),
    sources: [...new Set(candidates.map((c) => c.sourceName))],
    poorProviders: providers
      .filter(
        (p) =>
          p.enabled &&
          !candidates.some((c) => c.provider === p.provider_name && c.eligible),
      )
      .map((p) => p.provider_name),
    benchmarkCoverage: ["Disclosure Day", "Spider-Man: Brand New Day"].map(
      (title) => ({
        title,
        matches: candidates
          .filter((c) => c.movieTitle.toLowerCase() === title.toLowerCase())
          .map((c) => ({
            category: c.category,
            date: c.releaseDate,
            confidence: c.confidence,
          })),
      }),
    ),
  };
}
export async function automatedMonthlyPicks(
  monthKey: string,
): Promise<MonthlyWatchlistMovie[]> {
  return (await releaseCandidateReport(monthKey)).selected;
}
export async function setReleaseOverride(
  monthKey: string,
  eventId: string,
  action: "approve" | "exclude",
) {
  const report = await releaseCandidateReport(monthKey);
  if (!report.candidates.some((c) => c.eventId === eventId))
    throw new Error("Candidate does not belong to the requested month.");
  return upsertReleaseRows(
    "monthly_release_overrides",
    [
      {
        month_key: monthKey,
        event_id: eventId,
        action,
        updated_at: new Date().toISOString(),
      },
    ],
    "month_key,event_id",
  );
}
