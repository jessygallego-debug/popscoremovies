"use client";

import Link from "next/link";
import { usePopFile } from "@/app/components/popfile-provider";

export default function DesktopStatsLink() {
  const { profile } = usePopFile();

  if (!profile) return null;

  return (
    <Link
      href={`/profile/${encodeURIComponent(profile.username)}?tab=stats`}
      className="transition hover:text-yellow-300"
    >
      Stats
    </Link>
  );
}
