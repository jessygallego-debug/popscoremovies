import EmojiIcon from "@/app/components/emoji-icon";
import MovieSearch from "@/app/components/movie-search";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import AnimatedLogoReel from "@/app/components/animated-logo-reel";
import MobileSiteMenu from "@/app/components/mobile-site-menu";
import NotificationBell from "@/app/components/notification-bell";
import ProfileMenu from "@/app/components/profile-menu";
import DesktopStatsLink from "@/app/components/desktop-stats-link";

const navItems = [
  { href: "/#trending", label: "Movies" },
  { href: "/community", label: "Community" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/discover", label: "Movie Match" },
];

function SiteLogo() {
  return (
    <Link
      href="/"
      aria-label="Go to PopScore Movies home"
      className="group min-w-0 shrink-0 transition hover:opacity-90"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-yellow-400/25 bg-yellow-400/10 shadow-lg shadow-yellow-400/10 sm:h-12 sm:w-12 md:h-11 md:w-11"
        >
          <span className="relative block h-8 w-8 sm:h-10 sm:w-10 md:h-9 md:w-9">
            <Image
              src="/rating-icons/extra-buttery-v2.png"
              alt="PopScore movie rating and recommendation site"
              fill
              sizes="(min-width: 768px) 36px, (min-width: 640px) 40px, 32px"
              className="object-contain transition group-hover:scale-105"
              priority
            />
          </span>
        </span>
        <span>
          <span className="flex items-center text-2xl font-black leading-none tracking-wide sm:text-3xl md:text-[28px]">
            <span className="text-white">P</span>
            <AnimatedLogoReel />
            <span className="text-white">P</span>
            <span className="text-yellow-400">SCORE</span>
          </span>
          <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.22em] md:hidden">
            Movie Ratings for Movie Lovers
          </span>
        </span>
      </div>
    </Link>
  );
}

export default function SiteHeader({ showSearch = false }: { showSearch?: boolean }) {
  return (
    <header className="relative z-[2000] flex items-center justify-between gap-5 border-b border-white/10 pb-5">
      <SiteLogo />
      <nav className={`hidden items-center text-sm font-black text-slate-200 md:flex ${showSearch ? "gap-4 xl:gap-5" : "gap-8"}`}>
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="transition hover:text-yellow-300"
          >
            {item.label}
          </Link>
        ))}
        <DesktopStatsLink />
        <Link href="/faq" className="transition hover:text-yellow-300">FAQ</Link>
      </nav>
      {showSearch ? (
        <MovieSearch compact initialQuery="" />
      ) : null}
      <div className="hidden items-center gap-3 md:flex">
        <Suspense
          fallback={
            <div className="h-11 w-11 rounded-2xl border border-slate-700/90 bg-slate-950/85" />
          }
        >
          <NotificationBell />
        </Suspense>
        <Suspense
          fallback={
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-300 shadow-lg shadow-yellow-400/10">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-yellow-400/30 bg-black/40">
                <EmojiIcon emoji="🍿" size={22} />
              </span>
              My PopFile
            </div>
          }
        >
          <ProfileMenu />
        </Suspense>
      </div>
      <div className="flex items-center gap-2 md:hidden">
        <Suspense
          fallback={
            <div className="h-11 w-11 rounded-2xl border border-slate-700/90 bg-slate-950/85" />
          }
        >
          <NotificationBell />
        </Suspense>
        <Suspense
          fallback={
            <div className="h-11 w-11 rounded-2xl border border-slate-700/90 bg-slate-950/85" />
          }
        >
          <MobileSiteMenu />
        </Suspense>
      </div>
    </header>
  );
}
