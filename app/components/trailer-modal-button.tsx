"use client";

import { useEffect, useMemo, useState } from "react";

type TrailerModalButtonProps = {
  autoOpen?: boolean;
  className?: string;
  moviePath: string;
  movieTitle: string;
  trailerKey: string;
  trailerTitle?: string;
};

export default function TrailerModalButton({
  autoOpen = false,
  className = "inline-flex min-h-12 items-center justify-center rounded-lg border border-yellow-400/50 bg-black/40 px-6 font-bold text-yellow-300 transition hover:border-yellow-300 hover:bg-yellow-400/10",
  moviePath,
  movieTitle,
  trailerKey,
  trailerTitle,
}: TrailerModalButtonProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [statusMessage, setStatusMessage] = useState("");
  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({
      autoplay: "1",
      modestbranding: "1",
      rel: "0",
    });

    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
      trailerKey
    )}?${params.toString()}`;
  }, [trailerKey]);
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return moviePath;
    }

    const url = new URL(moviePath, window.location.origin);
    url.searchParams.set("trailer", "1");

    return url.toString();
  }, [moviePath]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const copyTrailerLink = () => {
    setStatusMessage("");
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setStatusMessage("Trailer link copied!");
      })
      .catch(() => {
        setStatusMessage("Could not copy link.");
      });
  };

  const handleShareTrailer = async () => {
    setStatusMessage("");

    if (!navigator.share) {
      copyTrailerLink();
      return;
    }

    try {
      await navigator.share({
        title: `${movieTitle} Trailer on PopScore`,
        text: `Watch the ${movieTitle} trailer on PopScore.`,
        url: shareUrl,
      });
    } catch {
      // Closing the native share sheet should not show an error.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        Watch Trailer
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${movieTitle} trailer`}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/82 px-4 py-8 backdrop-blur-sm"
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/70"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {trailerTitle ?? `${movieTitle} Trailer`}
                </p>
                <p className="mt-0.5 text-xs font-bold text-slate-500">
                  {movieTitle}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Share trailer"
                  title="Share trailer"
                  onClick={handleShareTrailer}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-yellow-400/60 hover:bg-yellow-400/10 hover:text-yellow-300"
                >
                  <svg
                    aria-hidden="true"
                    className="h-7 w-7"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4.5"
                    viewBox="0 0 48 48"
                  >
                    <path d="M8 40C7.5 26.5 15.5 16.5 31 14V7l14 13-14 13v-8C19.5 25 12 30.5 8 40Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Close trailer"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-sm font-black text-slate-300 transition hover:border-yellow-400/60 hover:text-yellow-300"
                >
                  X
                </button>
              </div>
            </div>
            {statusMessage ? (
              <p className="border-b border-white/10 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-100">
                {statusMessage}
              </p>
            ) : null}
            <div className="aspect-video bg-black">
              <iframe
                title={`${movieTitle} trailer`}
                src={embedUrl}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
