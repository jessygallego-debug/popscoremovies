import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import AnimatedLogoReel from "@/app/components/animated-logo-reel";
import MobileSiteMenu from "@/app/components/mobile-site-menu";
import NotificationBell from "@/app/components/notification-bell";
import ProfileMenu from "@/app/components/profile-menu";

const navItems = [
  { href: "/#trending", label: "Movies" },
  { href: "/community", label: "Community" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/discover", label: "Movie Match" },
  { href: "/faq", label: "FAQ" },
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
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-yellow-400/25 bg-yellow-400/10 shadow-lg shadow-yellow-400/10 sm:h-12 sm:w-12 md:h-14 md:w-14"
        >
          <span className="relative block h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11">
            <Image
              src="/rating-icons/extra-buttery-v2.png"
              alt="PopScore movie rating and recommendation site"
              fill
              sizes="(min-width: 640px) 44px, 40px"
              className="object-contain transition group-hover:scale-105"
              priority
            />
          </span>
        </span>
        <span>
          <span className="flex items-center text-2xl font-black leading-none tracking-wide sm:text-3xl md:text-4xl">
            <span className="text-white">P</span>
            <AnimatedLogoReel />
            <span className="text-white">P</span>
            <span className="text-yellow-400">SCORE</span>
          </span>
          <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[10px] sm:tracking-[0.22em] md:text-xs">
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
      </nav>
      {showSearch ? (
        <form action="/" role="search" className="hidden min-w-0 max-w-md flex-1 items-center gap-2 rounded-full border border-slate-700/70 bg-[#131d2e]/85 px-4 shadow-inner shadow-black/20 xl:flex">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-slate-400 stroke-2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" />
          </svg>
          <input
            type="search"
            name="query"
            aria-label="Search movies, people, or genres"
            placeholder="Search movies, people, or genres..."
            className="h-11 min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-400"
          />
        </form>
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
                ★
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
