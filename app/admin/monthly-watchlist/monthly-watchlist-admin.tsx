"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseAccessToken } from "@/lib/profile-store";
import type { MonthlyWatchlistSnapshot } from "@/lib/monthly-watchlist";
import type { releaseCandidateReport } from "@/lib/releases/candidates";
type ReleaseReport = Awaited<ReturnType<typeof releaseCandidateReport>>;

type AdminResponse = {
  error?: string;
  monthKey?: string;
  snapshot?: MonthlyWatchlistSnapshot | null;
  releases?: ReleaseReport | null;
};

export default function MonthlyWatchlistAdmin({
  initialMonthKey,
}: {
  initialMonthKey: string;
}) {
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [snapshot, setSnapshot] = useState<MonthlyWatchlistSnapshot | null>(
    null,
  );
  const [message, setMessage] = useState("Loading campaign...");
  const [isWorking, setIsWorking] = useState(false);
  const [releases, setReleases] = useState<ReleaseReport | null>(null);
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  const request = useCallback(
    async (
      action?:
        | "finalize"
        | "generate"
        | "send_test"
        | "collect"
        | "approve"
        | "exclude"
        | "replace",
      eventId?: string,
      replacementEventId?: string,
    ) => {
      setIsWorking(true);
      setMessage(action ? "Working..." : "Loading campaign...");

      try {
        const token = await getSupabaseAccessToken();
        if (!token)
          throw new Error("Sign in with an administrator account first.");
        const response = await fetch(
          `/api/admin/monthly-watchlist?month=${encodeURIComponent(monthKey)}`,
          {
            body: action
              ? JSON.stringify({
                  action,
                  monthKey,
                  eventId,
                  replacementEventId,
                })
              : undefined,
            headers: {
              Authorization: `Bearer ${token}`,
              ...(action ? { "Content-Type": "application/json" } : {}),
            },
            method: action ? "POST" : "GET",
          },
        );
        const data = (await response.json()) as AdminResponse;
        if (!response.ok)
          throw new Error(data.error ?? "Campaign request failed.");
        setSnapshot(data.snapshot ?? null);
        setReleases(data.releases ?? null);
        setMessage(
          action === "send_test"
            ? "Test email sent. Check the configured test inbox on desktop and mobile."
            : data.snapshot
              ? "Campaign loaded."
              : "No campaign has been generated for this month yet.",
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setIsWorking(false);
      }
    },
    [monthKey],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void request(), 0);

    return () => window.clearTimeout(timeoutId);
  }, [request]);

  return (
    <div className="mt-10 space-y-6">
      <div className="rounded-3xl border border-yellow-400/25 bg-slate-950/90 p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-400">
          Campaign Admin
        </p>
        <h1 className="mt-2 text-3xl font-black">
          The PopScore Monthly Watchlist
        </h1>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="grid gap-2 text-sm font-bold text-slate-300">
            Month
            <input
              type="month"
              value={monthKey.slice(0, 7)}
              onChange={(event) => setMonthKey(`${event.target.value}-01`)}
              className="min-h-11 rounded-xl border border-slate-700 bg-black px-3 text-white"
            />
          </label>
          <button
            type="button"
            disabled={isWorking}
            onClick={() => void request("collect")}
            className="min-h-11 rounded-xl border border-slate-600 px-4 font-black disabled:opacity-50"
          >
            Refresh Release Sources
          </button>
          <button
            type="button"
            disabled={isWorking}
            onClick={() => void request("generate")}
            className="min-h-11 rounded-xl bg-yellow-400 px-4 font-black text-black disabled:opacity-50"
          >
            Generate Draft
          </button>
          <button
            type="button"
            disabled={isWorking || !snapshot}
            onClick={() => void request("finalize")}
            className="min-h-11 rounded-xl border border-yellow-400 px-4 font-black text-yellow-300 disabled:opacity-50"
          >
            Refresh & Finalize
          </button>
          <button
            type="button"
            disabled={isWorking || !snapshot?.movies.length}
            onClick={() => void request("send_test")}
            className="min-h-11 rounded-xl border border-slate-600 px-4 font-black text-white disabled:opacity-50"
          >
            Send Test Email
          </button>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-300" role="status">
          {message}
        </p>
      </div>

      {releases ? (
        <section className="space-y-4 rounded-2xl border border-slate-800 p-5">
          <h2 className="text-xl font-black">Release candidates</h2>
          <p className="text-sm text-slate-300">
            {releases.highMediumPercent}% have high or medium confidence.
            Services without eligible dates:{" "}
            {releases.poorProviders.join(", ") || "None"}. Approval is optional
            and cannot bypass stale or uncertain evidence.
          </p>
          {(["digital", "subscription_streaming"] as const).map((category) => (
            <div key={category}>
              <h3 className="my-3 font-black text-yellow-400">
                {category === "digital"
                  ? "Coming to Digital"
                  : "Coming to Streaming"}
              </h3>
              <div className="space-y-3">
                {releases.candidates
                  .filter((c) => c.category === category)
                  .map((candidate) => (
                    <article
                      key={candidate.eventId}
                      className="flex flex-wrap gap-4 rounded-xl border border-slate-700 p-3"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://image.tmdb.org/t/p/w154${candidate.posterPath}`}
                        alt={`${candidate.movieTitle} poster`}
                        width={70}
                        height={105}
                        className="rounded-lg object-cover"
                      />
                      <div className="min-w-48 flex-1 text-sm">
                        <p className="font-black">{candidate.movieTitle}</p>
                        <p>
                          {candidate.releaseDate} {candidate.provider}
                        </p>
                        <p>
                          {candidate.confidence} · Score{" "}
                          {candidate.rankingScore} ·{" "}
                          {candidate.excluded
                            ? "Excluded"
                            : candidate.eligible
                              ? "Eligible"
                              : "Needs verification"}
                        </p>
                        <a
                          href={candidate.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-yellow-300 underline"
                        >
                          {candidate.sourceName}
                        </a>
                        <p>
                          Verified{" "}
                          {new Date(candidate.verifiedAt).toLocaleString()}
                        </p>
                        {candidate.conflicting ? (
                          <p className="text-orange-300">
                            Conflicting dates retained for review.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <button
                          disabled={isWorking}
                          onClick={() =>
                            void request("approve", candidate.eventId)
                          }
                          className="rounded border border-yellow-400 p-2"
                        >
                          Approve
                        </button>
                        <button
                          disabled={isWorking}
                          onClick={() =>
                            void request("exclude", candidate.eventId)
                          }
                          className="rounded border border-slate-500 p-2"
                        >
                          Exclude
                        </button>
                        <select
                          aria-label={`Replacement for ${candidate.movieTitle}`}
                          value={replacements[candidate.eventId] ?? ""}
                          onChange={(e) =>
                            setReplacements((current) => ({
                              ...current,
                              [candidate.eventId]: e.target.value,
                            }))
                          }
                          className="max-w-52 rounded bg-slate-900 p-2"
                        >
                          <option value="">Choose replacement</option>
                          {releases.candidates
                            .filter(
                              (c) =>
                                c.category === category &&
                                c.eligible &&
                                c.eventId !== candidate.eventId,
                            )
                            .map((c) => (
                              <option key={c.eventId} value={c.eventId}>
                                {c.movieTitle}
                              </option>
                            ))}
                        </select>
                        <button
                          disabled={
                            isWorking || !replacements[candidate.eventId]
                          }
                          onClick={() =>
                            void request(
                              "replace",
                              candidate.eventId,
                              replacements[candidate.eventId],
                            )
                          }
                          className="rounded border border-slate-500 p-2"
                        >
                          Replace
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {snapshot ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Status", snapshot.campaign.status],
              ["Recipients", snapshot.campaign.recipientCount],
              ["Successful", snapshot.campaign.successfulSends],
              ["Failed", snapshot.campaign.failedSends],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
              >
                <p className="text-xs font-black uppercase text-yellow-400">
                  {label}
                </p>
                <p className="mt-1 text-xl font-black">{value}</p>
              </div>
            ))}
          </div>

          {snapshot.campaign.errorMessage ? (
            <p className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-sm font-bold text-red-200">
              {snapshot.campaign.errorMessage}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-950 text-yellow-400">
                <tr>
                  {["Movie", "Category", "Date", "Provider", "Type"].map(
                    (heading) => (
                      <th key={heading} className="px-4 py-3 font-black">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-black/40">
                {snapshot.movies.map((movie) => (
                  <tr key={`${movie.category}-${movie.movieId}`}>
                    <td className="px-4 py-3 font-bold">{movie.movieTitle}</td>
                    <td className="px-4 py-3">{movie.category}</td>
                    <td className="px-4 py-3">{movie.releaseDate}</td>
                    <td className="px-4 py-3">{movie.provider ?? "—"}</td>
                    <td className="px-4 py-3">{movie.availabilityType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-white p-2">
            <iframe
              title="Monthly Watchlist email preview"
              srcDoc={snapshot.previewHtml}
              className="h-[900px] w-full rounded-xl"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
