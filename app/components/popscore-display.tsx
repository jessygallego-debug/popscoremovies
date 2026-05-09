"use client";

import { useEffect, useState } from "react";
import { getPopScore, subscribeToPopScoreUpdates } from "@/lib/popscore-store";

type PopScoreDisplayProps = {
  movieId: string;
  className?: string;
};

export default function PopScoreDisplay({
  movieId,
  className = "mt-1 text-sm font-bold text-yellow-400",
}: PopScoreDisplayProps) {
  const [score, setScore] = useState<Awaited<ReturnType<typeof getPopScore>>>(
    null
  );

  useEffect(() => {
    let isCurrent = true;

    const updateScore = () => {
      getPopScore(movieId)
        .then((nextScore) => {
          if (isCurrent) {
            setScore(nextScore);
          }
        })
        .catch(() => {
          if (isCurrent) {
            setScore(null);
          }
        });
    };

    updateScore();

    const unsubscribe = subscribeToPopScoreUpdates(updateScore);

    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [movieId]);

  return (
    <p className={className}>
      {score
        ? `PopScore: ${score.score} (${score.count} ${
            score.count === 1 ? "rating" : "ratings"
          })`
        : "PopScore: Not rated yet"}
    </p>
  );
}
