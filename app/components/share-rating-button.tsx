"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MoviePosterImage from "@/app/components/movie-poster-image";
import {
  getCurrentProfile,
  getUserRatings,
  UserMovieRating,
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
  variant?: "default" | "compact";
};

type MovieRatingSharePanelProps = {
  className?: string;
  communityScore?: number | null;
  movieId: string;
  movieTitle: string;
  posterPath?: string | null;
};

function normalizePosterPath(path?: string | null) {
  const trimmedPath = path?.trim();

  if (
    !trimmedPath ||
    trimmedPath.toLowerCase() === "null" ||
    trimmedPath.toLowerCase() === "undefined"
  ) {
    return null;
  }

  return trimmedPath;
}

function sharePosterUrl(path?: string | null, size = "w500") {
  const normalizedPath = normalizePosterPath(path);

  if (!normalizedPath) {
    return null;
  }

  if (normalizedPath.startsWith("http")) {
    return normalizedPath;
  }

  return `https://image.tmdb.org/t/p/${size}${
    normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`
  }`;
}

export function getShareRatingLabel(score: number) {
  if (score >= 90) {
    return "Extra Buttery";
  }

  if (score >= 75) {
    return "Buttery";
  }

  if (score >= 60) {
    return "Fresh Popcorn";
  }

  if (score >= 40) {
    return "Salty";
  }

  return "Burnt";
}

function getShareRatingStatement(score: number) {
  if (score >= 90) return "One of my all-time favorites.";
  if (score >= 80) return "Highly recommended.";
  if (score >= 70) return "Definitely worth watching.";
  if (score >= 60) return "Worth a watch.";
  return "Didn't quite work for me.";
}

function getShareRatingIconSrc(score: number) {
  if (score >= 90) return "/rating-icons/extra-buttery-v2.png";
  if (score >= 75) return "/rating-icons/buttery.png";
  if (score >= 60) return "/rating-icons/fresh-popcorn.png";
  if (score >= 40) return "/rating-icons/salty.png";
  return "/rating-icons/burnt.png";
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    context.fillText(`${line}${suffix}`, x, y + index * lineHeight);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawImageContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.drawImage(
    image,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

async function getPosterForDownload(movieId: string, posterPath?: string | null) {
  const primaryPoster = sharePosterUrl(posterPath, "w780");

  if (primaryPoster) {
    return primaryPoster;
  }

  try {
    const response = await fetch(
      `/api/movie-poster?movie=${encodeURIComponent(movieId)}`
    );
    const data = (await response.json()) as { posterPath?: string | null };

    return sharePosterUrl(data.posterPath ?? null, "w780");
  } catch {
    return null;
  }
}

export function MovieRatingSharePanel({
  className = "",
  communityScore,
  movieId,
  movieTitle,
  posterPath,
}: MovieRatingSharePanelProps) {
  const [rating, setRating] = useState<UserMovieRating | null>(null);

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
      })
      .catch(() => {
        if (isCurrent) {
          setRating(null);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [movieId]);

  if (!rating) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-3 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
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
          variant="compact"
        />
      </div>
    </div>
  );
}

export default function ShareRatingButton({
  className = "",
  communityScore,
  movieId,
  movieTitle,
  popscore,
  posterPath,
  ratingLabel,
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
  const poster = sharePosterUrl(posterPath);
  const finalRatingLabel = ratingLabel ?? getShareRatingLabel(popscore);
  const ratingIconSrc = getShareRatingIconSrc(popscore);
  const shareStatement = getShareRatingStatement(popscore);
  const visibleCommunityScore =
    typeof communityScore === "number" &&
    Number.isFinite(communityScore) &&
    communityScore > 0
      ? Math.round(communityScore)
      : null;
  const hasCommunityScore = visibleCommunityScore !== null;
  const shareText = `I rated ${movieTitle} ${popscore} ${finalRatingLabel} on PopScore.\nWhat would you score it?\n${shareUrl}`;
  const previewScoreSize =
    popscore >= 100 ? "text-[3.35rem] sm:text-7xl" : "text-6xl sm:text-7xl";
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

  const handleShare = async () => {
    setStatusMessage("");

    if (!navigator.share) {
      handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: `${movieTitle} PopScore Rating`,
        text: `I rated ${movieTitle} ${popscore} ${finalRatingLabel} on PopScore.`,
        url: shareUrl,
      });
    } catch {
      // Closing the native share sheet should not show an error.
    }
  };

  const createStoryCanvas = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    const gradient = context.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, "#182131");
    gradient.addColorStop(0.44, "#030712");
    gradient.addColorStop(1, "#111006");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1080, 1920);

    context.fillStyle = "rgba(250, 204, 21, 0.09)";
    for (let x = 30; x < 1080; x += 58) {
      for (let y = 32; y < 1920; y += 58) {
        context.beginPath();
        context.arc(x, y, 2.4, 0, Math.PI * 2);
        context.fill();
      }
    }

    const halo = context.createRadialGradient(540, 860, 40, 540, 860, 680);
    halo.addColorStop(0, "rgba(250, 204, 21, 0.28)");
    halo.addColorStop(0.42, "rgba(250, 204, 21, 0.08)");
    halo.addColorStop(1, "rgba(250, 204, 21, 0)");
    context.fillStyle = halo;
    context.fillRect(0, 0, 1080, 1920);

    context.fillStyle = "#facc15";
    context.font = "900 58px Arial, sans-serif";
    context.fillText("POPSCORE", 72, 206);
    context.fillStyle = "#cbd5e1";
    context.font = "800 27px Arial, sans-serif";
    context.fillText("MOVIE RATINGS FOR REAL FANS", 74, 244);

    context.fillStyle = "rgba(250, 204, 21, 0.14)";
    context.strokeStyle = "rgba(250, 204, 21, 0.45)";
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(72, 326, 936, 990, 54);
    context.fill();
    context.stroke();

    context.fillStyle = "#facc15";
    context.font = "900 34px Arial, sans-serif";
    context.fillText("Rated on PopScore", 118, 398);

    context.fillStyle = "#ffffff";
    context.font = "900 62px Arial, sans-serif";
    wrapCanvasText(context, movieTitle, 118, 486, 820, 72, 2);

    const downloadPoster = await getPosterForDownload(movieId, posterPath);

    if (downloadPoster) {
      try {
        const image = await loadImage(downloadPoster);
        context.save();
        context.beginPath();
        context.roundRect(118, 624, 310, 465, 34);
        context.clip();
        context.fillStyle = "#020617";
        context.fillRect(118, 624, 310, 465);
        drawImageContain(context, image, 118, 624, 310, 465);
        context.restore();
      } catch {
        context.fillStyle = "#0f172a";
        context.fillRect(118, 624, 310, 465);
        context.fillStyle = "#64748b";
        context.font = "900 30px Arial, sans-serif";
        context.fillText("Poster", 225, 865);
      }
    } else {
      context.fillStyle = "#0f172a";
      context.fillRect(118, 624, 310, 465);
      context.fillStyle = "#64748b";
      context.font = "900 30px Arial, sans-serif";
      context.fillText("Poster", 225, 865);
    }

    context.strokeStyle = "rgba(250, 204, 21, 0.55)";
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(118, 624, 310, 465, 34);
    context.stroke();

    context.fillStyle = "#cbd5e1";
    context.font = "900 28px Arial, sans-serif";
    context.fillText("MY SCORE", 492, 674);

    context.fillStyle = "#facc15";
    context.font = "900 190px Arial, sans-serif";
    context.fillText(String(popscore), 492, 845);

    try {
      const ratingIcon = await loadImage(ratingIconSrc);
      drawImageContain(context, ratingIcon, 754, 696, 132, 172);
    } catch {
      // The text score remains the primary shareable element if the icon fails.
    }

    context.fillStyle = "#ffffff";
    context.font = "900 48px Arial, sans-serif";
    context.fillText(finalRatingLabel, 492, 926);

    context.fillStyle = "#cbd5e1";
    context.font = "800 35px Arial, sans-serif";
    wrapCanvasText(context, shareStatement, 492, 1002, 390, 44, 3);

    if (hasCommunityScore) {
      context.fillStyle = "rgba(2, 6, 23, 0.72)";
      context.strokeStyle = "rgba(250, 204, 21, 0.32)";
      context.lineWidth = 3;
      context.beginPath();
      context.roundRect(150, 1152, 780, 100, 32);
      context.fill();
      context.stroke();
      context.fillStyle = "#ffffff";
      context.font = "900 34px Arial, sans-serif";
      context.fillText(`My Score: ${popscore}`, 200, 1217);
      context.fillStyle = "#facc15";
      context.fillText(`Community Score: ${visibleCommunityScore}`, 548, 1217);
    }

    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.font = "900 50px Arial, sans-serif";
    context.fillText("What would you score it?", 540, 1468);
    context.fillStyle = "#facc15";
    context.font = "900 38px Arial, sans-serif";
    context.fillText("PopScoreMovies.com", 540, 1528);
    context.textAlign = "start";

    return canvas;
  };

  const handleShareStory = async () => {
    setIsSharingStory(true);
    setStatusMessage("Preparing your story...");

    try {
      const canvas = await createStoryCanvas();

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

              <div className="mx-auto mt-4 w-full max-w-[290px] overflow-hidden rounded-[2rem] border border-yellow-400/30 bg-[radial-gradient(circle_at_50%_42%,rgba(250,204,21,0.24),transparent_34%),linear-gradient(145deg,#182131,#020617_50%,#100f05)] p-4 shadow-2xl shadow-yellow-400/20 sm:mt-5 sm:max-w-[360px] sm:p-5">
                <div className="flex flex-col">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300 sm:text-xs">
                      Rated on PopScore
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-xl font-black leading-tight text-white sm:text-2xl">
                      {movieTitle}
                    </h3>
                  </div>

                  <div className="mt-3 grid grid-cols-[minmax(88px,0.85fr)_1fr] items-start gap-3">
                    <div className="relative aspect-[2/3] w-full self-start overflow-hidden rounded-2xl border border-yellow-400/30 bg-slate-950">
                      <MoviePosterImage
                        src={poster}
                        alt={`${movieTitle} movie poster`}
                        sizes="(min-width: 640px) 150px, 120px"
                        className="object-contain"
                        fallbackMovieId={movieId}
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/75 to-transparent" />
                    </div>
                    <div className="min-w-0 self-start pt-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                        My Score
                      </p>
                      <div className="mt-1 flex max-w-full items-center gap-1">
                        <p
                          className={`${previewScoreSize} font-black leading-none text-yellow-300`}
                        >
                          {popscore}
                        </p>
                        <span className="relative -ml-1 block h-10 w-10 shrink-0 overflow-hidden rounded-full border border-yellow-400/25 bg-yellow-400/10 sm:ml-0 sm:h-14 sm:w-14">
                          <Image
                            src={ratingIconSrc}
                            alt=""
                            fill
                            sizes="(min-width: 640px) 56px, 40px"
                            className="object-contain"
                          />
                        </span>
                      </div>
                      <p className="mt-1 text-lg font-black leading-tight text-white sm:text-xl">
                        {finalRatingLabel}
                      </p>
                      <p className="mt-2 text-xs font-bold leading-5 text-slate-300 sm:text-sm">
                        {shareStatement}
                      </p>
                    </div>
                  </div>

                  {hasCommunityScore ? (
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-yellow-400/20 bg-black/40 p-3 text-center">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                          My Score
                        </p>
                        <p className="text-lg font-black text-white">{popscore}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Community
                        </p>
                        <p className="text-lg font-black text-yellow-300">
                          {visibleCommunityScore}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 text-center">
                    <p className="text-lg font-black text-white">
                      What would you score it?
                    </p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-yellow-300">
                      PopScoreMovies.com
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-3">
                <button
                  type="button"
                  onClick={handleShare}
                  className="min-h-12 rounded-2xl bg-yellow-400 px-4 font-black text-black transition hover:bg-yellow-300"
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={handleShareStory}
                  disabled={isSharingStory}
                  className="min-h-12 rounded-2xl border border-yellow-400/35 bg-yellow-400/10 px-4 font-black text-yellow-300 transition hover:bg-yellow-400/15 disabled:cursor-wait disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
                >
                  Share to Story
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
