"use client";

import { useState } from "react";
import { addToWatchlist, MovieMeta } from "@/lib/profile-store";

type AddToWatchlistButtonProps = {
  movie: MovieMeta & { genre?: string };
  className?: string;
};

export default function AddToWatchlistButton({
  movie,
  className = "inline-flex min-h-12 items-center justify-center rounded-lg border border-yellow-400/50 bg-black/40 px-6 font-bold text-yellow-300 transition hover:border-yellow-300 hover:bg-yellow-400/10",
}: AddToWatchlistButtonProps) {
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={isSaving}
        onClick={() => {
          setIsSaving(true);
          setStatus("");
          addToWatchlist(movie)
            .then(() => setStatus("Added to watchlist"))
            .catch((error: Error) => setStatus(error.message))
            .finally(() => setIsSaving(false));
        }}
        className={className}
      >
        {isSaving ? "Adding..." : "Add to Watchlist"}
      </button>
      {status ? <p className="text-xs font-bold text-slate-400">{status}</p> : null}
    </div>
  );
}
