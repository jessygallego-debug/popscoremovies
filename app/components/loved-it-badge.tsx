"use client";

import { useEffect, useState } from "react";
import { CoStarCounts, getCoStarCounts } from "@/lib/co-star-store";

type LovedItBadgeProps = {
  movieId: string;
};

const emptyCounts: CoStarCounts = {
  loved: 0,
  trash: 0,
  worth: 0,
};

const REACTION_UPDATE_EVENT = "popscore-reactions-updated";

function lovedPercent(counts: CoStarCounts) {
  const total = counts.loved + counts.worth + counts.trash;

  if (total === 0) {
    return 0;
  }

  return Math.round((counts.loved / total) * 100);
}

export default function LovedItBadge({ movieId }: LovedItBadgeProps) {
  const [counts, setCounts] = useState<CoStarCounts>(emptyCounts);

  useEffect(() => {
    let isCurrent = true;

    const handleReactionUpdate = (event: Event) => {
      const updateEvent = event as CustomEvent<{
        counts?: CoStarCounts;
        movieId?: string;
      }>;

      if (
        updateEvent.detail?.movieId === movieId &&
        updateEvent.detail.counts
      ) {
        setCounts(updateEvent.detail.counts);
      }
    };

    window.addEventListener(REACTION_UPDATE_EVENT, handleReactionUpdate);

    getCoStarCounts(movieId)
      .then((nextCounts) => {
        if (isCurrent) {
          setCounts(nextCounts);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setCounts(emptyCounts);
        }
      });

    return () => {
      isCurrent = false;
      window.removeEventListener(REACTION_UPDATE_EVENT, handleReactionUpdate);
    };
  }, [movieId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-black/25 px-2 py-2 text-center text-[11px] font-black text-yellow-300 sm:px-3 sm:text-sm">
      🔥 {lovedPercent(counts)}% Loved It
    </div>
  );
}
