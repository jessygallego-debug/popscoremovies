"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { avatarForKey } from "@/lib/profile-config";
import {
  getCurrentUser,
  getProfileByUserId,
  ProfileRecord,
} from "@/lib/profile-store";

const mobileNavItems = [
  { href: "/#trending", label: "Movies" },
  { href: "/community", label: "Community" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/discover", label: "Discovery" },
];

export default function MobileSiteMenu() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const currentPath = `${pathname}${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;
  const popFileHref = profile
    ? `/profile/${profile.username}`
    : `/profile/edit?returnTo=${encodeURIComponent(currentPath)}`;
  const popFileAvatar = profile ? avatarForKey(profile.avatar_key).icon : "★";

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

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700/90 bg-slate-950/85 text-yellow-300 shadow-lg shadow-black/20 transition hover:border-yellow-400/70 hover:bg-yellow-400/10"
      >
        <span aria-hidden="true" className="flex flex-col gap-1.5">
          <span
            className={`block h-0.5 w-5 rounded-full bg-current transition ${
              isOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-5 rounded-full bg-current transition ${
              isOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-5 rounded-full bg-current transition ${
              isOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-40 mt-3 w-[calc(100vw-2.5rem)] max-w-xs overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/95 p-2 shadow-2xl shadow-black/60 backdrop-blur">
          <div className="grid gap-1">
            {mobileNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-yellow-400/10 hover:text-yellow-300"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-2 border-t border-white/10 pt-2">
            <Link
              href={popFileHref}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/45 bg-yellow-400 px-4 py-3 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-black/15 bg-black/10 text-base">
                {popFileAvatar}
              </span>
              My PopFile
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
