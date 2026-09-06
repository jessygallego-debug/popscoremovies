"use client";

import Link from "next/link";
import { useState } from "react";

export default function MonthlyWatchlistUnsubscribe({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const unsubscribe = async () => {
    setIsWorking(true);
    setMessage("");

    try {
      const response = await fetch("/api/email/monthly-watchlist/unsubscribe", {
        body: JSON.stringify({ token }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not unsubscribe.");
      setMessage("You are unsubscribed from the PopScore Monthly Watchlist.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="mt-10 rounded-3xl border border-yellow-400/25 bg-slate-950 p-6 text-center">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-400">
        Email Preferences
      </p>
      <h1 className="mt-2 text-3xl font-black">Monthly Watchlist</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
        Stop receiving the monthly email about new digital and streaming movies.
      </p>
      {message ? (
        <p className="mt-5 rounded-xl border border-slate-700 bg-black/40 p-4 text-sm font-bold" role="status">
          {message}
        </p>
      ) : (
        <button
          type="button"
          disabled={isWorking || !token}
          onClick={() => void unsubscribe()}
          className="mt-6 min-h-12 rounded-xl bg-yellow-400 px-6 font-black text-black disabled:opacity-50"
        >
          {isWorking ? "Unsubscribing..." : "Unsubscribe"}
        </button>
      )}
      <div className="mt-5">
        <Link href="/" className="font-bold text-yellow-300 underline">
          Return to PopScore
        </Link>
      </div>
    </div>
  );
}
