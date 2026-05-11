"use client";

import { useState } from "react";

type ReactionKey = "loved" | "worth" | "trash";

type Reaction = {
  emoji: string;
  key: ReactionKey;
  label: string;
};

const reactions: Reaction[] = [
  { emoji: "🔥", key: "loved", label: "Loved It" },
  { emoji: "🍿", key: "worth", label: "Worth Watching" },
  { emoji: "🗑️", key: "trash", label: "Trash" },
];

export default function CoStarReactions() {
  const [counts, setCounts] = useState<Record<ReactionKey, number>>({
    loved: 0,
    trash: 0,
    worth: 0,
  });
  const [selectedReaction, setSelectedReaction] = useState<ReactionKey | null>(
    null
  );

  const total = counts.loved + counts.worth + counts.trash;

  const getPercent = (key: ReactionKey) => {
    if (total === 0) {
      return 0;
    }

    return Math.round((counts[key] / total) * 100);
  };

  const handleReaction = (key: ReactionKey) => {
    setCounts((currentCounts) => {
      const nextCounts = { ...currentCounts };

      if (selectedReaction) {
        nextCounts[selectedReaction] = Math.max(
          nextCounts[selectedReaction] - 1,
          0
        );
      }

      nextCounts[key] += 1;
      return nextCounts;
    });
    setSelectedReaction(key);
  };

  return (
    <section className="mt-4 border-t border-white/10 pt-4">
      <h4 className="mb-3 text-sm font-black text-white">Co-Star Reactions</h4>

      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-white/10 bg-gray-950/70">
        {reactions.map((reaction) => {
          const isSelected = selectedReaction === reaction.key;

          return (
            <button
              key={reaction.key}
              type="button"
              onClick={() => handleReaction(reaction.key)}
              className={`min-h-16 border-r border-white/10 px-1.5 py-2 text-center text-[11px] font-bold transition last:border-r-0 hover:bg-yellow-400/10 active:scale-95 ${
                isSelected ? "bg-yellow-400/15 text-yellow-300" : "text-gray-200"
              }`}
            >
              <span className="block text-xl leading-none">{reaction.emoji}</span>
              <span className="mt-1 block leading-tight">{reaction.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px] font-black text-yellow-400">
        {reactions.map((reaction) => (
          <div key={reaction.key}>{getPercent(reaction.key)}%</div>
        ))}
      </div>

      <p className="mt-2 text-center text-[11px] font-bold text-gray-400">
        {total.toLocaleString()} Total Co-Star Reactions
      </p>
    </section>
  );
}
