"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import RatingSharePreview from "@/app/components/rating-share-preview";
import { createRatingShareCanvas, canvasToBlob } from "@/lib/rating-share-image";
import { getPopScoreTitle } from "@/lib/popscore-presentation";
import WatchDateEditor from "@/app/components/watch-date-editor";
import {
  getCurrentProfile,
  getUserRatings,
  logUserMovieRewatch,
  UserMovieRating,
  UserMovieWatch,
} from "@/lib/profile-store";
import { movieHref } from "@/lib/urls";

type ShareRatingButtonProps = {
  className?: string;
  communityScore?: number | null;
  movieId: string;
  movieTitle: string;
  popscore: number;
  posterPath?: string | null;
  ratingLabel?: string | null;
  releaseDate?: string | null;
  genreNames?: string[];
  variant?: "default" | "compact";
};

type MovieRatingSharePanelProps = {
  className?: string;
  communityScore?: number | null;
  genreNames?: string[];
  movieId: string;
  movieTitle: string;
  posterPath?: string | null;
  rateHref: string;
  releaseDate?: string | null;
  runtimeMinutes?: number | null;
};

export function getShareRatingLabel(score: number) {
  return getPopScoreTitle(score).label;
}

export function MovieRatingSharePanel({
  className = "",
  communityScore,
  genreNames = [],
  movieId,
  movieTitle,
  posterPath,
  rateHref,
  releaseDate,
  runtimeMinutes,
}: MovieRatingSharePanelProps) {
  const [rating, setRating] = useState<UserMovieRating | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingRewatch, setIsLoggingRewatch] = useState(false);
  const [rewatch, setRewatch] = useState<UserMovieWatch | null>(null);
  const [rewatchMessage, setRewatchMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    getCurrentProfile()
      .then((profile) => {
        if (!profile) {
          return [];
        }

        return getUserRatings(profile.user_id);
      })
      .then((ratings) => {
        if (!isCurrent) {
          return;
        }

        const movieRating =
          ratings.find(
            (item) =>
              item.movieId === movieId &&
              item.weights.length > 0 &&
              Object.keys(item.ratings).length > 0
          ) ?? null;

        setRating(movieRating);
        setIsLoading(false);
      })
      .catch(() => {
        if (isCurrent) {
          setRating(null);
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [movieId]);

  if (isLoading) {
    return (
      <div className="min-h-16 animate-pulse rounded-[1.25rem] border border-yellow-200/30 bg-yellow-400/20 motion-reduce:animate-none" />
    );
  }

  if (!rating) {
    return (
      <Link
        href={rateHref}
        className="flex min-h-16 items-center justify-between rounded-[1.25rem] border border-yellow-200/70 bg-[linear-gradient(135deg,#fde047_0%,#facc15_50%,#f59e0b_100%)] px-5 py-4 text-black shadow-2xl shadow-yellow-500/20 transition hover:-translate-y-0.5 hover:brightness-105 sm:px-6"
      >
        <span className="text-xl font-black sm:text-2xl">Rate This Movie</span>
        <span aria-hidden="true" className="text-4xl font-black leading-none">›</span>
      </Link>
    );
  }

  const logRewatch = () => {
    setIsLoggingRewatch(true);
    setRewatchMessage("");
    logUserMovieRewatch({
      movie: {
        genreNames,
        movieId,
        movieTitle,
        posterPath,
        releaseDate,
        runtimeMinutes,
      },
      ratingId: rating.id,
    })
      .then((watch) => {
        setRewatch(watch);
        setRewatchMessage(watch ? "Rewatch added" : "Could not log this rewatch.");
      })
      .catch(() => setRewatchMessage("Could not log this rewatch. Please try again."))
      .finally(() => setIsLoggingRewatch(false));
  };

  return (
    <div
      className={`rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-3 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-yellow-300">
            Your Rating
          </p>
          <p className="mt-0.5 text-base font-black text-white">
            {rating.popscore}% {getShareRatingLabel(rating.popscore)}
          </p>
        </div>
        <ShareRatingButton
          communityScore={communityScore}
          movieId={movieId}
          movieTitle={movieTitle}
          popscore={rating.popscore}
          posterPath={rating.posterPath ?? posterPath}
          releaseDate={releaseDate}
          genreNames={genreNames}
          variant="compact"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-yellow-400/15 pt-3">
        <button
          type="button"
          disabled={isLoggingRewatch}
          onClick={logRewatch}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-yellow-400/45 bg-black/35 px-4 text-sm font-black text-yellow-300 transition hover:border-yellow-300 hover:bg-yellow-400/10 disabled:cursor-wait disabled:opacity-60"
        >
          {isLoggingRewatch ? "Logging..." : "+ Log Rewatch"}
        </button>
        {rewatchMessage ? (
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-300">
            <span>{rewatchMessage}</span>
            {rewatch ? (
              <WatchDateEditor
                watch={rewatch}
                onChanged={(nextWatch) => setRewatch(nextWatch)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ShareRatingButton({
  className = "",
  movieId,
  movieTitle,
  popscore,
  posterPath,
  releaseDate,
  genreNames,
  variant = "default",
}: ShareRatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSharingStory, setIsSharingStory] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const moviePath = movieHref({ id: movieId, title: movieTitle });
  const shareUrl =
    typeof window === "undefined"
      ? moviePath
      : new URL(moviePath, window.location.origin).toString();
  const finalRatingLabel = getShareRatingLabel(popscore);
  const shareText = `I rated ${movieTitle} ${popscore} ${finalRatingLabel} on PopScore.\nWhat would you score it?\n${shareUrl}`;
  const imageData = useMemo(() => ({ movieId, movieTitle, popscore, posterPath, releaseDate, genreNames }), [movieId, movieTitle, popscore, posterPath, releaseDate, genreNames]);
  const fileSafeTitle = useMemo(
    () =>
      movieTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70) || "movie",
    [movieTitle]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const buttonClasses =
    variant === "compact"
      ? "inline-flex min-h-10 items-center justify-center rounded-full border border-yellow-400/35 bg-black/50 px-4 text-sm font-black text-yellow-300 transition hover:border-yellow-300 hover:bg-yellow-400/10"
      : "inline-flex min-h-12 items-center justify-center rounded-2xl bg-yellow-400 px-5 text-base font-black text-black shadow-[0_0_24px_rgba(250,204,21,0.32)] transition hover:bg-yellow-300";

  const handleCopy = () => {
    setStatusMessage("");
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setStatusMessage("Link copied!");
      })
      .catch(() => {
        setStatusMessage("Could not copy link.");
      });
  };

  const handleShareStory = async () => {
    setIsSharingStory(true);
    setStatusMessage("Preparing your story...");

    try {
      const canvas = await createRatingShareCanvas(imageData);

      if (!canvas) {
        setStatusMessage("Could not create story image.");
        return;
      }

      const blob = await canvasToBlob(canvas);

      if (!blob) {
        setStatusMessage("Could not create story image.");
        return;
      }

      const file = new File([blob], `${fileSafeTitle}-popscore-story.png`, {
        type: "image/png",
      });
      const shareData = { files: [file] };

      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        setStatusMessage("Story image ready to post.");
        return;
      }

      setStatusMessage("Story sharing is not available on this browser.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatusMessage("");
        return;
      }

      setStatusMessage("Could not open story sharing.");
    } finally {
      setIsSharingStory(false);
    }
  };

  const shareDialog =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-x-0 top-0 z-[10000] flex h-[100dvh] items-start justify-center overflow-y-auto bg-black/80 px-3 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
            role="dialog"
            aria-modal="true"
            aria-label={`Share your ${movieTitle} rating`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setIsOpen(false);
              }
            }}
          >
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-yellow-400/30 bg-slate-950 p-4 text-white shadow-2xl shadow-yellow-400/20 sm:max-h-[90vh] sm:overflow-y-auto sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300 sm:text-xs sm:tracking-[0.2em]">
                    SHARE RATING
                  </p>
                  <h2 className="mt-1 text-xl font-black sm:text-3xl">
                    Share your PopScore
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black text-slate-300 transition hover:border-yellow-400/50 hover:text-yellow-300"
                  aria-label="Close share dialog"
                >
                  X
                </button>
              </div>

              <RatingSharePreview data={imageData} />

              <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
                <button
                  type="button"
                  onClick={handleShareStory}
                  disabled={isSharingStory}
                  className="min-h-12 rounded-2xl bg-yellow-400 px-4 font-black text-black transition hover:bg-yellow-300 disabled:cursor-wait disabled:opacity-60"
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-12 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 font-black text-yellow-300 transition hover:bg-yellow-400/15"
                >
                  Copy Link
                </button>
              </div>

              {statusMessage ? (
                <p className="mt-3 text-center text-sm font-black text-yellow-200">
                  {statusMessage}
                </p>
              ) : null}

              <p className="mt-3 whitespace-pre-line break-words rounded-2xl border border-white/10 bg-black/35 p-3 text-xs font-bold leading-5 text-slate-400 sm:mt-4">
                {shareText}
              </p>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setStatusMessage("");
        }}
        className={`${buttonClasses} ${className}`}
      >
        Share My Rating
      </button>
      {shareDialog}
    </>
  );
}
