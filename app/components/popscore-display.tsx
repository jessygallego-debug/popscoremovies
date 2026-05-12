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
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-yellow-400/20 bg-yellow-400/10 text-xl sm:h-12 sm:w-12 sm:text-2xl">
          🍿
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col items-start leading-tight sm:flex-row sm:items-baseline sm:gap-2">
            <span className="text-xl font-black text-yellow-400 sm:text-2xl">
              NR
            </span>
            <span className="max-w-full text-sm font-black leading-tight text-white">
              Not rated yet
            </span>
          </div>
          <p className="mt-1 text-[11px] font-bold text-slate-500 sm:text-xs">
            Be the first!
          </p>
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
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full border border-yellow-400/20 bg-yellow-400/10 p-1 sm:h-12 sm:w-12 sm:p-1.5">
          <Image
            src={popScoreTitle.iconSrc}
            alt={`${popScoreTitle.label} PopScore icon`}
            fill
            sizes="(min-width: 640px) 48px, 40px"
            className="object-contain"
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col items-start leading-tight sm:flex-row sm:items-baseline sm:gap-2">
            <span className="text-xl font-black text-yellow-400 sm:text-2xl">
              {showNumericScore ? `${score.score}%` : "Rated"}
            </span>
            <span className="max-w-full whitespace-normal break-words text-sm font-black leading-tight text-white">
              {popScoreTitle.label}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-bold text-slate-500 sm:text-xs">
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
