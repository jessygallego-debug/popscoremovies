"use client";

import { useEffect, useState } from "react";
import {
  CoStarReaction,
  getCoStarCounts,
  saveCoStarReaction,
} from "@/lib/co-star-store";

type Reaction = {
  emoji: string;
  key: CoStarReaction;
  label: string;
};

type CoStarReactionsProps = {
  movieId: string;
};

const reactions: Reaction[] = [
  { emoji: "🔥", key: "loved", label: "Loved It" },
  { emoji: "🍿", key: "worth", label: "Good Watch" },
  { emoji: "🗑️", key: "trash", label: "Trash" },
];

export default function CoStarReactions({ movieId }: CoStarReactionsProps) {
  const [counts, setCounts] = useState<Record<CoStarReaction, number>>({
    loved: 0,
    trash: 0,
    worth: 0,
  });
  const [selectedReaction, setSelectedReaction] =
    useState<CoStarReaction | null>(null);

  const total = counts.loved + counts.worth + counts.trash;

  useEffect(() => {
    let isCurrent = true;

    getCoStarCounts(movieId)
      .then((nextCounts) => {
        if (isCurrent) {
          setCounts(nextCounts);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setCounts({ loved: 0, trash: 0, worth: 0 });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [movieId]);

  const getPercent = (key: CoStarReaction) => {
    if (total === 0) {
      return 0;
    }

    return Math.round((counts[key] / total) * 100);
  };

  const handleReaction = (key: CoStarReaction) => {
    saveCoStarReaction(movieId, key)
      .then(() => {
        setCounts((currentCounts) => ({
          ...currentCounts,
          [key]: currentCounts[key] + 1,
        }));
        setSelectedReaction(key);
      })
      .catch(() => {
        setSelectedReaction(null);
      });
  };

  return (
    <section>
      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
        {reactions.map((reaction) => {
          const isSelected = selectedReaction === reaction.key;

          return (
            <button
              key={reaction.key}
              type="button"
              onClick={() => handleReaction(reaction.key)}
              className={`min-h-20 min-w-0 overflow-hidden border-r border-slate-800 px-0.5 py-2 text-center text-[9px] font-bold transition last:border-r-0 hover:bg-yellow-400/10 active:scale-95 sm:px-1.5 sm:text-[10px] ${
                isSelected ? "bg-yellow-400/15 text-yellow-300" : "text-slate-200"
              }`}
            >
              <span className="block text-lg leading-none sm:text-xl">
                {reaction.emoji}
              </span>
              <span className="mx-auto mt-1 block max-w-14 whitespace-normal break-words leading-tight sm:max-w-16">
                {reaction.label}
              </span>
              <span className="mt-2 block text-sm font-black text-yellow-400 sm:text-base">
                {getPercent(reaction.key)}%
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
        {total === 0
          ? "No reactions yet"
          : `${total.toLocaleString()} ${total === 1 ? "reaction" : "reactions"}`}
      </p>
    </section>
  );
}
