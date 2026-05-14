"use client";

import Image from "next/image";
import { useState } from "react";

type MoviePosterImageProps = {
  alt: string;
  className?: string;
  sizes: string;
  src: string | null;
};

export default function MoviePosterImage({
  alt,
  className = "object-cover",
  sizes,
  src,
}: MoviePosterImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
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
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
