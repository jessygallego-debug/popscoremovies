"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getCurrentProfile, getUserRatings, UserMovieRating } from "@/lib/profile-store";
import { movieHrefById } from "@/lib/urls";

type ShareRatingButtonProps = {
  className?: string;
  movieId: string;
  movieTitle: string;
  popscore: number;
  posterPath?: string | null;
  ratingLabel?: string | null;
  variant?: "default" | "compact";
};

type MovieRatingSharePanelProps = {
  className?: string;
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

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function MovieRatingSharePanel({
  className = "",
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
      className={`rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-4 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">
            Your Rating
          </p>
          <p className="mt-1 text-lg font-black text-white">
            {rating.popscore}% {getShareRatingLabel(rating.popscore)}
          </p>
        </div>
        <ShareRatingButton
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
  movieId,
  movieTitle,
  popscore,
  posterPath,
  ratingLabel,
  variant = "default",
}: ShareRatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [downloadStatus, setDownloadStatus] = useState("");
  const [canNativeShare] = useState(
    () => typeof navigator !== "undefined" && Boolean(navigator.share)
  );
  const moviePath = movieHrefById(movieId);
  const shareUrl =
    typeof window === "undefined"
      ? moviePath
      : new URL(moviePath, window.location.origin).toString();
  const poster = sharePosterUrl(posterPath);
  const finalRatingLabel = ratingLabel ?? getShareRatingLabel(popscore);
  const shareText = `I rated ${movieTitle} ${popscore}% ${finalRatingLabel} on PopScore.`;
  const fileSafeTitle = useMemo(
    () =>
      movieTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70) || "popscore-rating",
    [movieTitle]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const buttonClasses =
    variant === "compact"
      ? "inline-flex min-h-10 items-center justify-center rounded-full border border-yellow-400/35 bg-black/50 px-4 text-sm font-black text-yellow-300 transition hover:border-yellow-300 hover:bg-yellow-400/10"
      : "inline-flex min-h-12 items-center justify-center rounded-2xl bg-yellow-400 px-5 text-base font-black text-black shadow-[0_0_24px_rgba(250,204,21,0.32)] transition hover:bg-yellow-300";

  const handleCopy = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopyStatus("Copied!");
      })
      .catch(() => {
        setCopyStatus("Copy failed");
      });
  };

  const handleNativeShare = () => {
    if (!navigator.share) {
      return;
    }

    navigator
      .share({
        title: `${movieTitle} PopScore Rating`,
        text: shareText,
        url: shareUrl,
      })
      .catch(() => null);
  };

  const handleDownload = async () => {
    setDownloadStatus("Preparing...");

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");

    if (!context) {
      setDownloadStatus("Could not create image");
      return;
    }

    const gradient = context.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, "#111827");
    gradient.addColorStop(0.46, "#020617");
    gradient.addColorStop(1, "#17130a");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1200, 630);

    context.fillStyle = "rgba(250, 204, 21, 0.09)";
    for (let x = 20; x < 1200; x += 52) {
      for (let y = 24; y < 630; y += 52) {
        context.beginPath();
        context.arc(x, y, 2, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.fillStyle = "#facc15";
    context.font = "900 42px Arial, sans-serif";
    context.fillText("POPSCORE", 74, 92);
    context.fillStyle = "#cbd5e1";
    context.font = "800 22px Arial, sans-serif";
    context.fillText("MOVIE RATINGS FOR REAL FANS", 76, 128);

    context.fillStyle = "#ffffff";
    context.font = "900 64px Arial, sans-serif";
    wrapCanvasText(context, movieTitle, 76, 235, 620, 76, 3);

    context.fillStyle = "#facc15";
    context.font = "900 108px Arial, sans-serif";
    context.fillText(`${popscore}%`, 76, 500);
    context.fillStyle = "#ffffff";
    context.font = "900 36px Arial, sans-serif";
    context.fillText(finalRatingLabel, 76, 548);
    context.fillStyle = "#cbd5e1";
    context.font = "800 24px Arial, sans-serif";
    context.fillText("I rated this on PopScore", 76, 590);

    context.strokeStyle = "rgba(250, 204, 21, 0.5)";
    context.lineWidth = 4;
    context.beginPath();
    context.roundRect(790, 74, 300, 450, 26);
    context.stroke();

    if (poster) {
      try {
        const image = await loadImage(poster);
        context.save();
        context.beginPath();
        context.roundRect(790, 74, 300, 450, 26);
        context.clip();
        context.drawImage(image, 790, 74, 300, 450);
        context.restore();
      } catch {
        context.fillStyle = "#0f172a";
        context.fillRect(790, 74, 300, 450);
        context.fillStyle = "#64748b";
        context.font = "900 28px Arial, sans-serif";
        context.fillText("Poster", 885, 292);
      }
    } else {
      context.fillStyle = "#0f172a";
      context.fillRect(790, 74, 300, 450);
      context.fillStyle = "#64748b";
      context.font = "900 28px Arial, sans-serif";
      context.fillText("Poster", 885, 292);
    }

    context.fillStyle = "#facc15";
    context.font = "900 26px Arial, sans-serif";
    context.fillText("popscoremovies.com", 790, 582);

    downloadDataUrl(canvas.toDataURL("image/png"), `${fileSafeTitle}-popscore.png`);
    setDownloadStatus("Downloaded");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setCopyStatus("");
          setDownloadStatus("");
        }}
        className={`${buttonClasses} ${className}`}
      >
        Share My Rating
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Share your ${movieTitle} rating`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-yellow-400/30 bg-slate-950 p-5 text-white shadow-2xl shadow-yellow-400/20 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
                  Share Rating
                </p>
                <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                  Share your PopScore
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black text-slate-300 transition hover:border-yellow-400/50 hover:text-yellow-300"
                aria-label="Close share dialog"
              >
                X
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-yellow-400/25 bg-gradient-to-br from-slate-900 via-slate-950 to-black">
              <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                <div className="relative min-h-64 bg-slate-900 sm:min-h-72">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={`${movieTitle} movie poster`}
                      fill
                      unoptimized
                      sizes="(min-width: 640px) 180px, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-64 items-center justify-center px-4 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                      Poster Coming Soon
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
                <div className="flex flex-col justify-between p-5 sm:p-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-300">
                      My PopScore
                    </p>
                    <h3 className="mt-2 text-3xl font-black text-white">
                      {movieTitle}
                    </h3>
                    <div className="mt-5 flex flex-wrap items-end gap-3">
                      <span className="text-6xl font-black text-yellow-300">
                        {popscore}%
                      </span>
                      <span className="pb-2 text-xl font-black text-white">
                        {finalRatingLabel}
                      </span>
                    </div>
                  </div>
                  <p className="mt-6 text-sm font-bold leading-6 text-slate-300">
                    I rated this on PopScore, where movies are scored by what
                    matters most for each genre.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {canNativeShare ? (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="min-h-12 rounded-2xl bg-yellow-400 px-4 font-black text-black transition hover:bg-yellow-300"
                >
                  Share
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-12 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 font-black text-yellow-300 transition hover:bg-yellow-400/15"
              >
                {copyStatus || "Copy Link"}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 font-black text-white transition hover:border-yellow-400/40 hover:text-yellow-300"
              >
                {downloadStatus || "Download Image"}
              </button>
            </div>

            <p className="mt-4 break-words rounded-2xl border border-white/10 bg-black/35 p-3 text-xs font-bold leading-5 text-slate-400">
              {shareText} {shareUrl}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
