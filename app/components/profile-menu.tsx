"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getCurrentUser,
  getProfileByUserId,
  ProfileRecord,
} from "@/lib/profile-store";

const menuItems = [
  { href: "/profile/edit", label: "Edit PopFile" },
  { href: "stats", label: "PopFile Stats" },
  { href: "watchlist", label: "Watchlist" },
  { href: "discover", label: "Discovery" },
];

export default function ProfileMenu() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const currentPath = `${pathname}${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;
  const signInHref = `/profile/edit?returnTo=${encodeURIComponent(
    currentPath
  )}`;

  useEffect(() => {
    let isCurrent = true;

    getCurrentUser().then((user) => {
      if (!user) {
        return;
      }

      getProfileByUserId(user.id).then((nextProfile) => {
        if (isCurrent) {
          setProfile(nextProfile);
        }
      });
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  if (!profile) {
    return (
      <Link
        href={signInHref}
        className="shrink-0 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300 shadow-lg shadow-yellow-400/10 transition hover:border-yellow-300 hover:bg-yellow-400 hover:text-black"
      >
        Sign In
      </Link>
    );
  }

  const profilePath = `/profile/${profile.username}`;

  return (
    <details className="group relative shrink-0">
      <summary className="list-none rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300 shadow-lg shadow-yellow-400/10 transition hover:cursor-pointer hover:border-yellow-300 hover:bg-yellow-400 hover:text-black">
        PopFile
      </summary>
      <div className="absolute right-0 z-30 mt-3 w-56 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/95 p-2 shadow-2xl shadow-black/50">
        {menuItems.map((item) => {
          const href = item.href.startsWith("/")
            ? item.href
            : `${profilePath}?tab=${item.href}`;

          return (
            <Link
              key={item.label}
              href={href}
              className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-yellow-400 hover:text-black"
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
