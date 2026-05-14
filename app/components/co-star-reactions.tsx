"use client";

import { useEffect, useState } from "react";
import {
  CoStarReaction,
  getCoStarCounts,
  saveCoStarReaction,
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
          setMessage("Create or sign in to your profile to react.");
          return Promise.reject(new Error("Missing profile"));
        }

        return saveCoStarReaction(movieId, key, profile.user_id);
      })
      .then(() => {
        getCoStarCounts(movieId).then(setCounts).catch(() => null);
        setSelectedReaction(key);

        if (movie) {
          saveUserQuickReaction({
            movie,
            quickReaction: profileReactionMap[key],
          }).catch(() => null);
        }
      })
      .catch((error: Error) => {
        if (error.message !== "Missing profile") {
          setSelectedReaction(null);
          setMessage("Could not save reaction. Please try again.");
        }
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
              className={`grid min-h-24 min-w-0 grid-rows-[1.5rem_2.25rem_1.5rem] items-center overflow-hidden border-r border-slate-800 px-0.5 py-2 text-center text-[9px] font-bold transition last:border-r-0 hover:bg-yellow-400/10 active:scale-95 sm:min-h-24 sm:grid-rows-[1.75rem_2.5rem_1.75rem] sm:px-1.5 sm:text-[10px] ${
                isSelected ? "bg-yellow-400/15 text-yellow-300" : "text-slate-200"
              }`}
            >
              <span className="flex items-center justify-center text-lg leading-none sm:text-xl">
                {reaction.emoji}
              </span>
              <span className="mx-auto flex max-w-14 items-center justify-center whitespace-normal break-words leading-tight sm:max-w-16">
                {reaction.label}
              </span>
              <span className="flex items-center justify-center text-sm font-black leading-none text-yellow-400 sm:text-base">
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
      {message ? (
        <p className="mt-2 text-center text-[11px] font-bold text-yellow-300">
          {message}
        </p>
      ) : null}
    </section>
  );
}
