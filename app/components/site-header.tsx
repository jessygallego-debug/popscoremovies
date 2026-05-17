import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import ProfileMenu from "@/app/components/profile-menu";

const navItems = [
  { href: "/#trending", label: "Movies" },
  { href: "/#why-popscore", label: "Community" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/discover", label: "Discovery" },
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
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-yellow-400/25 bg-yellow-400/10 shadow-lg shadow-yellow-400/10 sm:h-14 sm:w-14"
        >
          <span className="relative block h-10 w-10 sm:h-11 sm:w-11">
            <Image
              src="/rating-icons/extra-buttery-v2.png"
              alt=""
              fill
              sizes="(min-width: 640px) 44px, 40px"
              className="object-contain transition group-hover:scale-105"
              priority
            />
          </span>
        </span>
        <span>
          <span className="block text-3xl font-black leading-none tracking-wide text-yellow-400 sm:text-4xl">
            POPSCORE
          </span>
          <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 sm:text-xs">
            Movie Ratings For Real Fans
          </span>
        </span>
      </div>
    </Link>
  );
}

export default function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-5 border-b border-white/10 pb-5">
      <SiteLogo />
      <nav className="hidden items-center gap-8 text-sm font-black text-slate-200 lg:flex">
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
    </header>
  );
}
