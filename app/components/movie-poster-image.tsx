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
};

export default function MoviePosterImage({
  alt,
  className = "object-cover",
  fallbackMovieId,
  onLoadError,
  sizes,
  src,
}: MoviePosterImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const recoveryKey = `${fallbackMovieId ?? ""}:${src ?? ""}`;
  const recoveryRequestKey = `${recoveryKey}:${failedSrc ?? ""}`;
  const attemptedRecoveryKeys = useRef(new Set<string>());
  const [recovery, setRecovery] = useState<{
    index: number;
    key: string;
    sources: string[];
  }>({
    index: 0,
    key: recoveryKey,
    sources: [],
  });
  const hasError = Boolean(src && src === failedSrc);
  const recoverySources = recovery.key === recoveryKey ? recovery.sources : [];
  const recoverySrc = recoverySources[recovery.index] ?? null;
  const activeSrc = src && !hasError ? src : recoverySrc;

  useEffect(() => {
    let isCurrent = true;
    const shouldRecover = Boolean(fallbackMovieId && (!src || hasError));
    const hasAttemptedRecovery =
      attemptedRecoveryKeys.current.has(recoveryRequestKey);

    if (!shouldRecover || hasAttemptedRecovery) {
      return () => {
        isCurrent = false;
      };
    }

    attemptedRecoveryKeys.current.add(recoveryRequestKey);

    const params = new URLSearchParams({
      movie: fallbackMovieId ?? "",
    });

    if (failedSrc) {
      params.set("failed", failedSrc);
    }

    fetch(`/api/movie-poster?${params.toString()}`)
      .then((response) => response.json())
      .then((data: { backdropPath?: string | null; posterPath?: string | null }) => {
        const fallbackSources = [
          posterUrl(data.posterPath ?? null),
          backdropUrl(data.backdropPath ?? null, "w500"),
        ].filter(
          (candidate): candidate is string =>
            Boolean(candidate && candidate !== src && candidate !== failedSrc)
        );

        if (isCurrent) {
          setRecovery({
            index: 0,
            key: recoveryKey,
            sources: fallbackSources,
          });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setRecovery({ index: 0, key: recoveryKey, sources: [] });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    failedSrc,
    fallbackMovieId,
    hasError,
    recoveryKey,
    recoveryRequestKey,
    src,
  ]);

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
      key={activeSrc}
      src={activeSrc}
      alt={alt}
      fill
      sizes={sizes}
      loading="lazy"
      decoding="async"
      quality={75}
      className={className}
      unoptimized
      onError={() => {
        if (activeSrc === src) {
          setFailedSrc(src);
        } else {
          setRecovery((current) => {
            if (current.key !== recoveryKey) {
              return current;
            }

            return {
              ...current,
              index: current.index + 1,
            };
          });
        }

        onLoadError?.();
      }}
    />
  );
}
