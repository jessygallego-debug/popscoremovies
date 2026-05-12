"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getPopScore, subscribeToPopScoreUpdates } from "@/lib/popscore-store";

type PopScoreDisplayProps = {
  movieId: string;
  className?: string;
  showNumericScore?: boolean;
  variant?: "inline" | "card";
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

  return { iconSrc: "/rating-icons/burnt.png", label: "Burnt" };
}

export default function PopScoreDisplay({
  movieId,
  className = "mt-1 text-sm font-bold text-yellow-400",
  showNumericScore = true,
  variant = "inline",
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

  if (!score && variant === "card") {
    return (
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/10 text-2xl">
          🍿
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-yellow-400">NR</span>
            <span className="text-sm font-black text-white">Not rated yet</span>
          </div>
          <p className="text-xs font-bold text-slate-500">Be the first!</p>
        </div>
      </div>
    );
  }

  if (!score) {
    return <p className={className}>PopScore: Not rated yet</p>;
  }

  const popScoreTitle = getPopScoreTitle(score.score);

  if (variant === "card") {
    return (
      <div className="flex items-center gap-3">
        <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-full border border-yellow-400/20 bg-yellow-400/10 p-1.5">
          <Image
            src={popScoreTitle.iconSrc}
            alt={`${popScoreTitle.label} PopScore icon`}
            fill
            sizes="48px"
            className="object-contain"
          />
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-yellow-400">
              {showNumericScore ? `${score.score}%` : "Rated"}
            </span>
            <span className="truncate text-sm font-black text-white">
              {popScoreTitle.label}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-500">
            {score.count} {score.count === 1 ? "rating" : "ratings"}
          </p>
        </div>
      </div>
    );
  }

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
          PopScore: {showNumericScore ? `${score.score}% - ` : ""}
          {popScoreTitle.label} ({score.count}{" "}
          {score.count === 1 ? "rating" : "ratings"})
        </span>
      </div>
    </div>
  );
}
