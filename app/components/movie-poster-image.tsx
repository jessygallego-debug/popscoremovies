"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { backdropUrl, posterUrl } from "@/lib/tmdb";

type MoviePosterImageProps = {
  alt: string;
  className?: string;
  fallbackMovieId?: string;
  onLoadError?: () => void;
  sizes: string;
  src: string | null;
  unoptimized?: boolean;
};

export default function MoviePosterImage({
  alt,
  className = "object-cover",
  fallbackMovieId,
  onLoadError,
  sizes,
  src,
  unoptimized = false,
}: MoviePosterImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const recoveryKey = `${fallbackMovieId ?? ""}:${src ?? ""}`;
  const attemptedRecoveryKeys = useRef(new Set<string>());
  const [recovery, setRecovery] = useState<{
    key: string;
    src: string | null;
  }>({
    key: recoveryKey,
    src: null,
  });
  const hasError = Boolean(src && src === failedSrc);
  const recoverySrc = recovery.key === recoveryKey ? recovery.src : null;
  const activeSrc = src && !hasError ? src : recoverySrc;

  useEffect(() => {
    let isCurrent = true;
    const shouldRecover = Boolean(fallbackMovieId && (!src || hasError));
    const hasAttemptedRecovery = attemptedRecoveryKeys.current.has(recoveryKey);

    if (!shouldRecover || hasAttemptedRecovery) {
      return () => {
        isCurrent = false;
      };
    }

    attemptedRecoveryKeys.current.add(recoveryKey);

    fetch(`/api/movie-poster?movie=${encodeURIComponent(fallbackMovieId ?? "")}`)
      .then((response) => response.json())
      .then((data: { backdropPath?: string | null; posterPath?: string | null }) => {
        const fallbackSrc =
          posterUrl(data.posterPath ?? null) ?? backdropUrl(data.backdropPath ?? null);

        if (isCurrent) {
          setRecovery({ key: recoveryKey, src: fallbackSrc });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setRecovery({ key: recoveryKey, src: null });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [fallbackMovieId, hasError, recoveryKey, src]);

  if (!activeSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-5 text-center">
        <span className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
          Poster Coming Soon
        </span>
      </div>
    );
  }

  return (
    <Image
      src={activeSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      onError={() => {
        if (activeSrc === src) {
          setFailedSrc(src);
        } else {
          setRecovery({ key: recoveryKey, src: null });
        }

        onLoadError?.();
      }}
      unoptimized={unoptimized}
    />
  );
}
