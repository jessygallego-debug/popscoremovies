"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseAccessToken } from "@/lib/profile-store";
import type { MonthlyWatchlistSnapshot } from "@/lib/monthly-watchlist";

type AdminResponse = {
  error?: string;
  monthKey?: string;
  snapshot?: MonthlyWatchlistSnapshot | null;
};

export default function MonthlyWatchlistAdmin({
  initialMonthKey,
}: {
  initialMonthKey: string;
}) {
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [snapshot, setSnapshot] = useState<MonthlyWatchlistSnapshot | null>(null);
  const [message, setMessage] = useState("Loading campaign...");
  const [isWorking, setIsWorking] = useState(false);

  const request = useCallback(
    async (action?: "finalize" | "generate" | "send_test") => {
      setIsWorking(true);
      setMessage(action ? "Working..." : "Loading campaign...");

      try {
        const token = await getSupabaseAccessToken();
        if (!token) throw new Error("Sign in with an administrator account first.");
        const response = await fetch(
          `/api/admin/monthly-watchlist?month=${encodeURIComponent(monthKey)}`,
          {
            body: action ? JSON.stringify({ action, monthKey }) : undefined,
            headers: {
              Authorization: `Bearer ${token}`,
              ...(action ? { "Content-Type": "application/json" } : {}),
            },
            method: action ? "POST" : "GET",
          }
        );
        const data = (await response.json()) as AdminResponse;
        if (!response.ok) throw new Error(data.error ?? "Campaign request failed.");
        setSnapshot(data.snapshot ?? null);
        setMessage(
          action === "send_test"
            ? "Test email sent. Check the configured test inbox on desktop and mobile."
            : data.snapshot
              ? "Campaign loaded."
              : "No campaign has been generated for this month yet."
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setIsWorking(false);
      }
    },
    [monthKey]
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
        <h1 className="mt-2 text-3xl font-black">The PopScore Monthly Watchlist</h1>
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

      {snapshot ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Status", snapshot.campaign.status],
              ["Recipients", snapshot.campaign.recipientCount],
              ["Successful", snapshot.campaign.successfulSends],
              ["Failed", snapshot.campaign.failedSends],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-black uppercase text-yellow-400">{label}</p>
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
                  {['Movie', 'Category', 'Date', 'Provider', 'Type'].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-black">{heading}</th>
                  ))}
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
