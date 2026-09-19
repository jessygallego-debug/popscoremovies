"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWatchlistMembership } from "@/app/components/watchlist-membership-provider";
import { addToWatchlist, removeFromWatchlist, type MovieMeta } from "@/lib/profile-store";

type AddToWatchlistButtonProps = {
  movie: MovieMeta & { genre?: string };
  className?: string;
  variant?: "text" | "poster";
};

export default function AddToWatchlistButton({ movie, className, variant = "text" }: AddToWatchlistButtonProps) {
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const { hasLoadError, isLoaded, movieIds } = useWatchlistMembership();
  const isOnWatchlist = isLoaded && movieIds.has(movie.movieId);
  const label = !isLoaded ? "Checking Watchlist" : hasLoadError ? "Watchlist unavailable" : isOnWatchlist ? "Remove from Watchlist" : "Add to Watchlist";

  useEffect(() => {
    if (!status || isError) return;
    const timeout = window.setTimeout(() => setStatus(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [status, isError]);

  const toggle = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setStatus("");
    setIsError(false);
    try {
      if (isOnWatchlist) await removeFromWatchlist(movie.movieId);
      else await addToWatchlist(movie);
      setStatus(isOnWatchlist ? "Removed from Watchlist" : "Added to Watchlist");
    } catch (error) {
      setIsError(true);
      setStatus(error instanceof Error ? error.message : "Could not update your watchlist. Please try again.");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-pressed={isOnWatchlist}
        aria-busy={isSaving}
        title={label}
        disabled={!isLoaded || hasLoadError || isSaving}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); void toggle(); }}
        className={variant === "poster"
          ? `absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border shadow-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 disabled:cursor-wait disabled:opacity-60 sm:right-4 sm:top-4 ${isOnWatchlist ? "border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300" : "border-white/20 bg-black/60 text-white hover:bg-black/80"}`
          : `${className ?? "inline-flex min-h-12 items-center justify-center rounded-lg border border-yellow-400/50 bg-black/40 px-6 font-bold text-yellow-300"} disabled:opacity-60`}
      >
        {variant === "poster" ? (
          isOnWatchlist ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M6 3a1 1 0 0 0-1 1v17l7-4 7 4V4a1 1 0 0 0-1-1H6Z" /></svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          )
        ) : isSaving ? "Saving..." : label}
      </button>
      {status ? createPortal(
        <div role={isError ? "alert" : "status"} className="fixed bottom-6 left-1/2 z-[1000] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-yellow-400/40 bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-xl">
          <span>{status}</span>
          {isError ? <button type="button" aria-label="Dismiss watchlist message" onClick={() => setStatus("")} className="p-1 text-yellow-300">✕</button> : null}
        </div>, document.body
      ) : null}
    </>
  );
}
