import {
  earliestUsDigital,
  newSubscriptionProviders,
  subscriptionNote,
  suspiciousSubscriptionNote,
  digitalConfidence,
  type ReleaseMovie,
  type ReleaseSource,
} from "./policy";
import { releaseRest, upsertReleaseRows } from "./store";
type Provider = {
  provider_id: string;
  provider_name: string;
  tmdb_provider_ids: number[];
  enabled: boolean;
};
type Detail = {
  id: number;
  adult: boolean;
  title: string;
  poster_path: string | null;
  popularity: number;
  vote_count: number;
  vote_average: number;
  revenue: number;
  overview: string;
  genres?: {id:number;name:string}[];
  belongs_to_collection: unknown;
  release_dates: { results: Parameters<typeof earliestUsDigital>[0] };
  "watch/providers": {
    results: {
      US?: {
        flatrate?: { provider_id: number }[];
        rent?: { provider_id: number }[];
        buy?: { provider_id: number }[];
      };
    };
  };
};
async function tmdb<T>(path: string) {
  const token = process.env.TMDB_API_TOKEN;
  if (!token) throw new Error("TMDB_API_TOKEN is missing.");
  const response = await fetch(`https://api.themoviedb.org/3/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`TMDB request failed (${response.status}).`);
  return response.json() as Promise<T>;
}
function offset(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export async function collectMovieReleases(
  options: { start?: string; end?: string } = {},
) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const start = options.start ?? today,
    end = options.end ?? offset(today, 60);
  if (
    ![start, end].every(
      (d) =>
        /^\d{4}-\d{2}-\d{2}$/.test(d) &&
        new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d,
    ) ||
    end < start ||
    (Date.parse(end) - Date.parse(start)) / 86400000 > 92
  )
    throw new Error("Invalid collection window.");
  const verifiedAt = new Date().toISOString();
  const runId = await releaseRest<string | null>(
    "rpc/claim_release_collection",
    { method: "POST", body: JSON.stringify({ p_report: { start, end } }) },
  );
  if (!runId) return { skipped: true, reason: "collector_running" };
  const errors: string[] = [],
    notes: string[] = [];
  const counts = {
    digital: 0,
    streaming: 0,
    detections: 0,
    snapshots: 0,
    movies: 0,
  };
  const providers = await releaseRest<Provider[]>(
    "streaming_providers?enabled=eq.true",
  );
  const sources = await releaseRest<
    (ReleaseSource & {
      enabled: boolean;
      endpoint: string | null;
      permission_note: string;
    })[]
  >("release_sources?enabled=eq.true");
  const ids = new Set<number>();
  try {
    let totalPages = 1;
    for (let page = 1; page <= totalPages; page++) {
      const result = await tmdb<{
        results: { id: number }[];
        total_pages: number;
      }>(
        `discover/movie?region=US&with_release_type=4&release_date.gte=${start}&release_date.lte=${end}&include_adult=false&sort_by=popularity.desc&page=${page}`,
      );
      totalPages = Math.min(result.total_pages, 20);
      if (result.total_pages > 20 && page === 1)
        notes.push(
          `Digital discovery truncated: ${result.total_pages} pages; collecting the most popular 20 pages.`,
        );
      result.results.forEach((m) => ids.add(m.id));
    }
  } catch {
    errors.push("TMDB digital discovery failed; retained previous evidence.");
  }
  // Recheck previously tracked announcements too: delays must be seen even after leaving the discovery window.
  const tracked = await releaseRest<{ tmdb_id: number }[]>(
    `movie_release_events?status=eq.active&announced_release_date=gte.${start}&select=tmdb_id&limit=400`,
  );
  tracked.forEach((m) => ids.add(Number(m.tmdb_id)));
  // Popular theatrical candidates establish provider baselines before their subscription arrival.
  try {
    for (let page = 1; page <= 3; page++) {
      const recent = await tmdb<{ results: { id: number }[] }>(
        `discover/movie?region=US&with_release_type=3&release_date.gte=${offset(today, -180)}&release_date.lte=${today}&include_adult=false&sort_by=popularity.desc&page=${page}`,
      );
      recent.results.forEach((m) => ids.add(m.id));
    }
  } catch {
    errors.push("Recent theatrical discovery failed.");
  }
  const list = [...ids].slice(0, 400);
  if (ids.size > 400)
    notes.push(
      `Movie collection bounded at 400 of ${ids.size} candidates; coverage is incomplete.`,
    );
  for (let batch = 0; batch < list.length; batch += 8)
    await Promise.all(
      list.slice(batch, batch + 8).map(async (id) => {
        try {
          const detail = await tmdb<Detail>(
            `movie/${id}?append_to_response=release_dates,watch/providers`,
          );
          if (detail.adult !== false || !detail.poster_path) return;
          const us = detail.release_dates.results
            .filter((r) => r.iso_3166_1 === "US")
            .flatMap((r) => r.release_dates);
          const theatrical = us
            .filter((r) => r.type === 2 || r.type === 3)
            .map((r) => r.release_date.slice(0, 10))
            .sort()[0];
          const movie: ReleaseMovie = {
            tmdb_id: id,
            title: detail.title,
            poster_path: detail.poster_path,
            popularity: detail.popularity ?? 0,
            vote_count: detail.vote_count ?? 0,
            vote_average: detail.vote_average ?? 0,
            metadata: {
              theatrical_date: theatrical,
              revenue: detail.revenue,
              genres: detail.genres ?? [],
              franchise: Boolean(detail.belongs_to_collection),
              overview: detail.overview,
              us_release_dates: us,
            },
          };
          await upsertReleaseRows(
            "release_movie_metadata",
            [{ ...movie, verified_at: verifiedAt }],
            "tmdb_id",
          );
          counts.movies++;
          const first = earliestUsDigital(
            detail.release_dates.results.map((region) => ({
              ...region,
              release_dates: region.release_dates.filter(
                (r) => !suspiciousSubscriptionNote(r.note ?? ""),
              ),
            })),
          );
          const old = await releaseRest<
            { id: string; source_event_key: string }[]
          >(
            `movie_release_events?tmdb_id=eq.${id}&source_id=eq.tmdb&status=eq.active&select=id,source_event_key`,
          );
          const keys: string[] = [];
          if (first) {
            const date = first.release_date.slice(0, 10);
            if (date >= start && date <= end) {
              const eventKey = `${id}:digital::${date}`;
              keys.push(eventKey);
              await upsertReleaseRows(
                "movie_release_events",
                [
                  {
                    tmdb_id: id,
                    release_type: "digital",
                    provider_id: null,
                    announced_release_date: date,
                    source_id: "tmdb",
                    source_event_key: eventKey,
                    source_url: `https://www.themoviedb.org/movie/${id}/release-dates`,
                    confidence: digitalConfidence(
                      theatrical,
                      date,
                      first.note ?? "",
                    ),
                    verified_at: verifiedAt,
                    status: "active",
                    evidence: {
                      release_type: 4,
                      note: first.note ?? "",
                      first_us_digital: true,
                    },
                  },
                ],
                "source_id,source_event_key",
              );
              counts.digital++;
            }
          }
          // Future subscription announcements require an explicit provider in a US type-4 record.
          // Current watch-provider availability is never attached to a digital date.
          const subscriptionDates = us.filter(
            (r) =>
              (r.type === 4 || r.type === 6) &&
              subscriptionNote(r.note ?? "") &&
              Number.isFinite(Date.parse(r.release_date)),
          );
          for (const provider of providers) {
            const date = subscriptionDates
              .filter(
                (r) => subscriptionNote(r.note ?? "") === provider.provider_id,
              )
              .map((r) => r.release_date.slice(0, 10))
              .sort()[0];
            if (!date || date < start || date > end) continue;
            const key = `${id}:subscription_streaming:${provider.provider_id}:${date}`;
            keys.push(key);
            await upsertReleaseRows(
              "movie_release_events",
              [
                {
                  tmdb_id: id,
                  release_type: "subscription_streaming",
                  provider_id: provider.provider_id,
                  announced_release_date: date,
                  source_id: "tmdb",
                  source_event_key: key,
                  source_url: `https://www.themoviedb.org/movie/${id}/release-dates`,
                  confidence: "MEDIUM",
                  verified_at: verifiedAt,
                  status: "active",
                  evidence: {
                    release_type: subscriptionDates.find(
                      (r) =>
                        r.release_date.slice(0, 10) === date &&
                        subscriptionNote(r.note ?? "") === provider.provider_id,
                    )?.type,
                    explicit_provider_note: provider.provider_name,
                  },
                },
              ],
              "source_id,source_event_key",
            );
            counts.streaming++;
          }
          for (const row of old)
            if (!keys.includes(row.source_event_key))
              await releaseRest(`movie_release_events?id=eq.${row.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: "superseded" }),
              });
          if (!detail["watch/providers"]?.results)
            throw new Error(
              "Provider response missing; preserve previous snapshot.",
            );
          const availability = detail["watch/providers"].results.US;
          const flatrate = (availability?.flatrate ?? []).map(
              (p) => p.provider_id,
            ),
            rent = (availability?.rent ?? []).map((p) => p.provider_id),
            buy = (availability?.buy ?? []).map((p) => p.provider_id);
          const previous = await releaseRest<{ flatrate: number[] }[]>(
            `movie_provider_snapshots?tmdb_id=eq.${id}&checked_date=lt.${today}&order=checked_date.desc&limit=1`,
          );
          await upsertReleaseRows(
            "movie_provider_snapshots",
            [
              {
                tmdb_id: id,
                checked_date: today,
                checked_at: verifiedAt,
                flatrate,
                rent,
                buy,
              },
            ],
            "tmdb_id,checked_date",
          );
          counts.snapshots++;
          const added = newSubscriptionProviders(
            previous[0]?.flatrate ?? null,
            flatrate,
          );
          for (const provider of providers.filter(
            (p) =>
              p.tmdb_provider_ids.some((pid) => added.includes(pid)) &&
              !p.tmdb_provider_ids.some((pid) =>
                previous[0]?.flatrate.includes(pid),
              ),
          )) {
            await upsertReleaseRows(
              "movie_release_events",
              [
                {
                  tmdb_id: id,
                  release_type: "subscription_streaming",
                  provider_id: provider.provider_id,
                  detected_available_date: today,
                  source_id: "tmdb_availability",
                  source_event_key: `${id}:${provider.provider_id}:${today}`,
                  source_url: `https://www.themoviedb.org/movie/${id}/watch?locale=US`,
                  confidence: "LOW",
                  verified_at: verifiedAt,
                  evidence: { flatrate, not_announced_premiere: true },
                },
              ],
              "source_id,source_event_key",
            );
            counts.detections++;
          }
        } catch {
          errors.push(
            `Movie ${id} refresh failed; previous evidence preserved.`,
          );
        }
      }),
    );
  // Future adapters are reviewed per source. Unverified websites are deliberately not activated.
  for (const source of sources.filter(
    (s) => !["tmdb", "tmdb_availability"].includes(s.source_id),
  )) {
    if (!source.endpoint) {
      errors.push(`${source.name}: no reviewed endpoint configured.`);
      continue;
    }
    try {
      const response = await fetch(source.endpoint, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Source failed");
      const records: unknown = await response.json();
      if (!Array.isArray(records) || records.length > 1000)
        throw new Error("Invalid source payload");
      for (const item of records as {
        tmdbId?: number;
        providerId?: string;
        releaseDate?: string;
        country?: string;
        sourceUrl?: string;
      }[]) {
        if (
          item.country !== "US" ||
          !Number.isInteger(item.tmdbId) ||
          !providers.some((p) => p.provider_id === item.providerId) ||
          !item.releaseDate ||
          !/^\d{4}-\d{2}-\d{2}$/.test(item.releaseDate) ||
          new Date(`${item.releaseDate}T00:00:00Z`)
            .toISOString()
            .slice(0, 10) !== item.releaseDate ||
          !item.sourceUrl?.startsWith("https://")
        ) {
          notes.push(`${source.name}: rejected unmapped or invalid record.`);
          continue;
        }
        const conflictingPayload = (records as (typeof item)[]).some(
          (other) =>
            other.tmdbId === item.tmdbId &&
            other.providerId === item.providerId &&
            other.releaseDate !== item.releaseDate,
        );
        if (conflictingPayload) {
          notes.push(
            `${source.name}: conflicting dates for ${item.tmdbId}; retained existing evidence.`,
          );
          continue;
        }
        const known = await releaseRest<ReleaseMovie[]>(
          `release_movie_metadata?tmdb_id=eq.${item.tmdbId}`,
        );
        if (!known.length) {
          const detail = await tmdb<Detail>(
            `movie/${item.tmdbId}?append_to_response=release_dates`,
          );
          if (detail.adult !== false || !detail.poster_path) {
            notes.push(`${source.name}: rejected TMDB movie ${item.tmdbId}.`);
            continue;
          }
          await upsertReleaseRows(
            "release_movie_metadata",
            [
              {
                tmdb_id: detail.id,
                title: detail.title,
                poster_path: detail.poster_path,
                popularity: detail.popularity,
                vote_count: detail.vote_count,
                vote_average: detail.vote_average,
                verified_at: verifiedAt,
                metadata: {
                  overview: detail.overview,
                  revenue: detail.revenue,
                  genres: detail.genres ?? [],
                  franchise: Boolean(detail.belongs_to_collection),
                },
              },
            ],
            "tmdb_id",
          );
        }
        const prior = await releaseRest<
          { id: string; announced_release_date: string }[]
        >(
          `movie_release_events?tmdb_id=eq.${item.tmdbId}&provider_id=eq.${item.providerId}&source_id=eq.${source.source_id}&status=eq.active`,
        );
        await upsertReleaseRows(
          "movie_release_events",
          [
            {
              tmdb_id: item.tmdbId,
              release_type: "subscription_streaming",
              provider_id: item.providerId,
              announced_release_date: item.releaseDate,
              source_id: source.source_id,
              source_event_key: `${item.tmdbId}:${item.providerId}:${item.releaseDate}`,
              source_url: item.sourceUrl,
              confidence:
                source.kind === "official"
                  ? "HIGH"
                  : source.kind === "structured"
                    ? "MEDIUM"
                    : "LOW",
              verified_at: verifiedAt,
              status: "active",
              evidence: item,
            },
          ],
          "source_id,source_event_key",
        );
        counts.streaming++;
        for (const old of prior)
          if (old.announced_release_date !== item.releaseDate)
            await releaseRest(`movie_release_events?id=eq.${old.id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: "superseded" }),
            });
      }
    } catch {
      errors.push(
        `${source.name} failed; retained previous verified information.`,
      );
    }
  }
  const report = {
    start,
    end,
    counts,
    errors,
    notes,
    sources: sources.map((s) => s.name),
    futureStreamingCoverage:
      "No independently verified free future-streaming feed is enabled. Provider detections cannot fill future dates.",
  };
  await releaseRest(`release_collection_runs?id=eq.${runId}`, {
    method: "PATCH",
    body: JSON.stringify({
      finished_at: new Date().toISOString(),
      status: errors.length ? "partial" : "complete",
      report,
    }),
  });
  return report;
}
