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
  { href: "/streaming", label: "Now Streaming" },
];

function SiteLogo() {
  return (
    <Link
      href="/"
      aria-label="Go to PopScore Movies home"
      className="group min-w-0 shrink-0 transition hover:opacity-90"
    >
      <div className="flex items-center gap-1.5 sm:gap-3">
        <span
          className="relative block h-9 w-6 shrink-0 sm:h-9 sm:w-6"
        >
            <Image
              src="/branding/popscore-popcorn-bucket.webp"
              alt=""
              fill
              sizes="24px"
              className="object-contain transition group-hover:scale-105"
              preload
            />
        </span>
        <span aria-hidden="true" className="relative block h-[1em] w-[6.417em] text-[20px] leading-none text-[#FFC400] min-[375px]:text-[28px] min-[390px]:text-[30px] sm:text-[38px]">
          <Image src="/branding/popscore-wordmark.svg" alt="" fill unoptimized className="object-contain" />
          <span className="absolute left-[0.81em] top-[0.11em] flex">
            <AnimatedLogoReel />
          </span>
        </span>
      </div>
    </Link>
  );
}

export default function SiteHeader({ showSearch = false }: { showSearch?: boolean }) {
  return (
    <header className="relative z-[2000] flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-5 md:flex-nowrap">
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
          fallback={<span role="status" aria-label="Loading account" className="h-11 w-40 rounded-full bg-white/5" />}
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
      <Suspense fallback={<span className="ml-auto h-11 w-20 rounded-full bg-white/5 md:hidden" />}><ProfileMenu mobile /></Suspense>
    </header>
  );
}
