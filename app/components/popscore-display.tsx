"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getPopScore, subscribeToPopScoreUpdates } from "@/lib/popscore-store";

type PopScoreDisplayProps = {
  movieId: string;
  className?: string;
};

function getPopScoreTitle(score: number) {
  if (score >= 90) {
    return {
      iconSrc: "/rating-icons/extra-buttery.png",
      label: "Extra Buttery",
    };
  }

  if (score >= 75) {
    return { iconSrc: "/rating-icons/buttery.png", label: "Buttery" };
  }

  if (score >= 60) {
    return { iconSrc: "/rating-icons/fresh-popcorn.png", label: "Popcorn" };
  }

  if (score >= 40) {
    return { iconSrc: "/rating-icons/salty.png", label: "Salty" };
  }

  return { iconSrc: "/rating-icons/smoke.png", label: "Burnt" };
}

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

  if (!score) {
    return <p className={className}>PopScore: Not rated yet</p>;
  }

  const popScoreTitle = getPopScoreTitle(score.score);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span className="relative block h-8 w-8 overflow-hidden rounded-lg">
          <Image
            src={popScoreTitle.iconSrc}
            alt={`${popScoreTitle.label} PopScore icon`}
            fill
            sizes="32px"
            className="object-contain"
          />
        </span>
        <span>
          PopScore: {score.score}% - {popScoreTitle.label} ({score.count}{" "}
          {score.count === 1 ? "rating" : "ratings"})
        </span>
      </div>
    </div>
  );
}
