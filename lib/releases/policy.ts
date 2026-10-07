export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type ReleaseEvidence = {
  id: string;
  tmdb_id: number;
  release_type: "digital" | "subscription_streaming";
  provider_id: string | null;
  announced_release_date: string | null;
  detected_available_date?: string | null;
  source_id: string;
  source_url: string;
  confidence: Confidence;
  verified_at: string;
  status: string;
};
export type ReleaseSource = {
  source_id: string;
  kind: string;
  independent_family: string;
  name: string;
};
export type ReleaseMovie = {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  popularity: number;
  vote_count: number;
  vote_average: number;
  metadata: {
    theatrical_date?: string;
    revenue?: number;
    franchise?: boolean;
    overview?: string;
    us_release_dates?: unknown[];
    genres?: {id:number;name:string}[];
  };
};
const priority: Record<string, number> = {
  official: 5,
  structured: 4,
  tmdb: 3,
  supplemental: 2,
  detection: 1,
};
export function relevanceScore(movie: ReleaseMovie) {
  // Compress the different-sized inputs so dollars and large vote counts do not
  // swamp popularity. Popularity has the strongest coefficient, then votes,
  // then box office. These are scoring coefficients, not percentage weights.
  return (
    Math.round(
      (Math.log1p(Math.max(0, movie.popularity)) * 50 +
        Math.log1p(Math.max(0, movie.vote_count)) * 20 +
        Math.log1p(Math.max(0, movie.metadata.revenue ?? 0)) * 2) *
        100,
    ) / 100
  );
}
export function resolveReleaseEvidence(
  events: ReleaseEvidence[],
  sources: ReleaseSource[],
  now = new Date(),
) {
  const sourceMap = new Map(sources.map((s) => [s.source_id, s]));
  const groups = new Map<string, ReleaseEvidence[]>();
  for (const event of events) {
    if (
      event.status !== "active" ||
      !event.announced_release_date ||
      !sourceMap.has(event.source_id)
    )
      continue;
    const key = `${event.tmdb_id}:${event.release_type}:${event.provider_id ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.values()].map((evidence) => {
    evidence.sort(
      (a, b) =>
        (priority[sourceMap.get(b.source_id)!.kind] ?? 0) -
          (priority[sourceMap.get(a.source_id)!.kind] ?? 0) ||
        Date.parse(b.verified_at) - Date.parse(a.verified_at),
    );
    const winner = evidence[0];
    const age = (now.getTime() - Date.parse(winner.verified_at)) / 86400000;
    const families = new Set(
      evidence
        .filter(
          (e) =>
            e.announced_release_date === winner.announced_release_date &&
            (now.getTime() - Date.parse(e.verified_at)) / 86400000 <= 14 &&
            ["official", "structured", "tmdb"].includes(
              sourceMap.get(e.source_id)!.kind,
            ),
        )
        .map((e) => sourceMap.get(e.source_id)!.independent_family),
    );
    const conflicting = evidence.some(
      (e) => e.announced_release_date !== winner.announced_release_date,
    );
    const equalPriorityConflict = evidence.some(
      (e) =>
        e.announced_release_date !== winner.announced_release_date &&
        priority[sourceMap.get(e.source_id)!.kind] ===
          priority[sourceMap.get(winner.source_id)!.kind],
    );
    const confidence: Confidence =
      age > 14 || age < -0.01 || !Number.isFinite(age) || equalPriorityConflict
        ? "LOW"
        : sourceMap.get(winner.source_id)!.kind === "official" ||
            families.size >= 2
          ? "HIGH"
          : winner.confidence;
    return {
      ...winner,
      confidence,
      conflicting,
      stale: age > 14 || !Number.isFinite(age),
      evidence,
    };
  });
}
export function newSubscriptionProviders(
  previous: number[] | null,
  current: number[],
) {
  // A first snapshot establishes a baseline, never an invented premiere.
  return previous === null
    ? []
    : current.filter((id) => !previous.includes(id));
}
export function earliestUsDigital(
  dates: {
    iso_3166_1: string;
    release_dates: { type: number; release_date: string; note?: string }[];
  }[],
) {
  return (
    dates
      .filter((d) => d.iso_3166_1 === "US")
      .flatMap((d) => d.release_dates)
      .filter(
        (d) => d.type === 4 && Number.isFinite(Date.parse(d.release_date)),
      )
      .sort((a, b) => a.release_date.localeCompare(b.release_date))[0] ?? null
  );
}
export function subscriptionNote(note: string) {
  const normalized = note
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ");
  const aliases: Record<string, string> = {
    netflix: "netflix",
    "disney+": "disney",
    "disney plus": "disney",
    hulu: "hulu",
    "hbo max": "max",
    max: "max",
    peacock: "peacock",
    "peacock premium": "peacock",
    "paramount+": "paramount",
    "paramount plus": "paramount",
    "prime video": "prime",
    "amazon prime video": "prime",
    "apple tv+": "apple",
    "apple tv plus": "apple",
  };
  return aliases[normalized] ?? null;
}
export function suspiciousSubscriptionNote(note: string) {
  return /netflix|disney\+|hulu|hbo|max\b|peacock|paramount\+|prime video|apple tv\+|mubi|shudder|criterion|tubi|pluto|crunchyroll|roku channel/i.test(
    note,
  );
}
export function digitalConfidence(
  theatricalDate: string | undefined,
  digitalDate: string,
  note: string,
): Confidence {
  if (suspiciousSubscriptionNote(note)) return "LOW";
  const age = theatricalDate
    ? (Date.parse(digitalDate) - Date.parse(theatricalDate)) / 86400000
    : Infinity;
  // Very old catalog titles with a newly entered TMDB date cannot prove a first US digital release.
  if (age > 730 || age < 0) return "LOW";
  return "MEDIUM";
}
