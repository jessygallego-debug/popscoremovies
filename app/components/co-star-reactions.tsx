"use client";

import { useEffect, useState } from "react";
import {
  CoStarReaction,
  getCoStarCounts,
} from "@/lib/co-star-store";
import {
  getCurrentProfile,
  MovieMeta,
  ProfileQuickReaction,
  saveUserQuickReaction,
} from "@/lib/profile-store";

type Reaction = {
  emoji: string;
  key: CoStarReaction;
  label: string;
};

type CoStarReactionsProps = {
  movie?: MovieMeta & { genre?: string };
  movieId: string;
  variant?: "default" | "compact";
};

const reactions: Reaction[] = [
  { emoji: "🔥", key: "loved", label: "Loved It" },
  { emoji: "🍿", key: "worth", label: "Good Watch" },
  { emoji: "🗑️", key: "trash", label: "Trash" },
];

const profileReactionMap: Record<CoStarReaction, ProfileQuickReaction> = {
  loved: "loved_it",
  trash: "trash",
  worth: "worth_watching",
};

export default function CoStarReactions({
  movie,
  movieId,
  variant = "default",
}: CoStarReactionsProps) {
  const [counts, setCounts] = useState<Record<CoStarReaction, number>>({
    loved: 0,
    trash: 0,
    worth: 0,
  });
  const [selectedReaction, setSelectedReaction] =
    useState<CoStarReaction | null>(null);
  const [message, setMessage] = useState("");

  const total = counts.loved + counts.worth + counts.trash;
  const isCompact = variant === "compact";

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
    setMessage("");

    getCurrentProfile()
      .then((profile) => {
        if (!profile) {
          setMessage("Create or sign in to your PopFile to react.");
          return Promise.reject(new Error("Missing profile"));
        }

        if (!movie) {
          setMessage("Could not save reaction. Please try again.");
          return Promise.reject(new Error("Missing movie"));
        }

        return saveUserQuickReaction({
          movie,
          quickReaction: profileReactionMap[key],
        });
      })
      .then(() => {
        getCoStarCounts(movieId).then(setCounts).catch(() => null);
        setSelectedReaction(key);
      })
      .catch((error: Error) => {
        if (error.message !== "Missing profile" && error.message !== "Missing movie") {
          setSelectedReaction(null);
          setMessage("Could not save reaction. Please try again.");
        }
      });
  };

  return (
    <section>
      <div
        className={`grid grid-cols-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 ${
          isCompact ? "shadow-inner shadow-black/30" : ""
        }`}
      >
        {reactions.map((reaction) => {
          const isSelected = selectedReaction === reaction.key;

          return (
            <button
              key={reaction.key}
              type="button"
              onClick={() => handleReaction(reaction.key)}
              className={`grid min-w-0 items-center overflow-hidden border-r border-slate-800 text-center font-bold transition last:border-r-0 hover:bg-yellow-400/10 active:scale-95 ${
                isCompact
                  ? "min-h-16 grid-rows-[1.15rem_1.6rem_1.15rem] px-1 py-1.5 text-[9px] sm:min-h-16 sm:grid-rows-[1.25rem_1.7rem_1.25rem] sm:text-[9px]"
                  : "min-h-24 grid-rows-[1.5rem_2.25rem_1.5rem] px-0.5 py-2 text-[9px] sm:min-h-24 sm:grid-rows-[1.75rem_2.5rem_1.75rem] sm:px-1.5 sm:text-[10px]"
              } ${
                isSelected ? "bg-yellow-400/15 text-yellow-300" : "text-slate-200"
              }`}
            >
              <span
                className={`flex items-center justify-center leading-none ${
                  isCompact ? "text-base" : "text-lg sm:text-xl"
                }`}
              >
                {reaction.emoji}
              </span>
              <span
                className={`mx-auto flex items-center justify-center whitespace-normal break-words leading-tight ${
                  isCompact ? "max-w-12" : "max-w-14 sm:max-w-16"
                }`}
              >
                {reaction.label}
              </span>
              <span
                className={`flex items-center justify-center font-black leading-none text-yellow-400 ${
                  isCompact ? "text-xs" : "text-sm sm:text-base"
                }`}
              >
                {getPercent(reaction.key)}%
              </span>
            </button>
          );
        })}
      </div>

      <p
        className={`mt-2 text-center font-bold text-slate-500 ${
          isCompact ? "text-[10px]" : "text-[11px]"
        }`}
      >
        {total === 0
          ? "Total reactions: 0"
          : `Total reactions: ${total.toLocaleString()}`}
      </p>
      {message ? (
        <p className="mt-2 text-center text-[11px] font-bold text-yellow-300">
          {message}
        </p>
      ) : null}
    </section>
  );
}
