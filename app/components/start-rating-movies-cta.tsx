"use client";

import Link from "next/link";
import { usePopFile } from "@/app/components/popfile-provider";

export default function StartRatingMoviesCta() {
  const { isLoading, profile } = usePopFile();
  const href = profile ? "/rate" : "/profile/edit?returnTo=%2Frate";

  return (
    <Link
      href={href}
      aria-busy={isLoading}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-yellow-400/60 bg-yellow-400 px-5 py-2.5 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 hover:shadow-yellow-400/35"
    >
      Start Rating Movies
    </Link>
  );
}
