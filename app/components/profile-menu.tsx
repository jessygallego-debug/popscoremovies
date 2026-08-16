"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePopFile } from "@/app/components/popfile-provider";
import { avatarForKey } from "@/lib/profile-config";

const menuItems = [
  { href: "/profile/edit", label: "Edit PopFile" },
  { href: "stats", label: "PopFile Stats" },
  { href: "/community", label: "Community" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/discover", label: "Movie Match" },
];

export default function ProfileMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { isLoading: isProfileLoading, profile, signOut } = usePopFile();
  const currentPath = `${pathname}${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;
  const signInHref = `/profile/edit?returnTo=${encodeURIComponent(
    currentPath
  )}`;

  function handleSignOut() {
    signOut();
    menuRef.current?.removeAttribute("open");
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      const menu = menuRef.current;

      if (menu?.open && !menu.contains(event.target as Node)) {
        menu.removeAttribute("open");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        menuRef.current?.removeAttribute("open");
      }
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (isProfileLoading) {
    return (
      <button
        type="button"
        aria-busy="true"
        className="inline-flex shrink-0 cursor-wait items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300 opacity-80 shadow-lg shadow-yellow-400/10"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-yellow-400/30 bg-black/40">
          ★
        </span>
        My PopFile
      </button>
    );
  }

  if (!profile) {
    return (
      <Link
        href={signInHref}
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300 shadow-lg shadow-yellow-400/10 transition hover:border-yellow-300 hover:bg-yellow-400 hover:text-black hover:shadow-yellow-400/30"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-yellow-400/30 bg-black/40">
          ★
        </span>
        My PopFile
      </Link>
    );
  }

  const profilePath = `/profile/${profile.username}`;
  const avatar = avatarForKey(profile.avatar_key);

  return (
    <details ref={menuRef} className="group relative z-[200] shrink-0">
      <summary className="inline-flex list-none items-center gap-2 rounded-full border border-yellow-400/45 bg-yellow-400/10 px-3 py-2 text-sm font-black text-yellow-300 shadow-lg shadow-yellow-400/10 transition hover:cursor-pointer hover:border-yellow-300 hover:bg-yellow-400 hover:text-black hover:shadow-yellow-400/30">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-yellow-400/45 bg-black/40 text-lg">
          {avatar.icon}
        </span>
        <span>My PopFile</span>
        <span aria-hidden="true" className="text-yellow-300 group-hover:text-black">
          ›
        </span>
      </summary>
      <div className="absolute right-0 z-[300] mt-3 w-56 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-2 shadow-2xl shadow-black/50">
        {menuItems.map((item) => {
          const href = item.href.startsWith("/")
            ? item.href
            : `${profilePath}?tab=${item.href}`;

          return (
            <Link
              key={item.label}
              href={href}
              onClick={() => menuRef.current?.removeAttribute("open")}
              className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-yellow-400 hover:text-black"
            >
              {item.label}
            </Link>
          );
        })}
        <div className="mt-2 border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-300 transition hover:bg-yellow-400 hover:text-black"
          >
            Sign Out
          </button>
        </div>
      </div>
    </details>
  );
}
