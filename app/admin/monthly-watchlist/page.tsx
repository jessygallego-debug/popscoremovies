import type { Metadata } from "next";
import Link from "next/link";
import BrandHomeLink from "@/app/components/brand-home-link";
import MonthlyWatchlistAdmin from "@/app/admin/monthly-watchlist/monthly-watchlist-admin";
import { monthKeyWithOffset } from "@/lib/monthly-watchlist";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Monthly Watchlist Admin",
};

export default function MonthlyWatchlistAdminPage() {
  return (
    <main className="min-h-screen bg-black bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.12),transparent_34%),linear-gradient(180deg,#020617_0%,#000_50%,#020617_100%)] px-5 py-8 text-white sm:px-8 sm:py-12">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <BrandHomeLink />
          <Link
            href="/"
            aria-label="Exit Monthly Watchlist admin"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 font-black text-slate-300"
          >
            X
          </Link>
        </div>
        <MonthlyWatchlistAdmin
          initialMonthKey={monthKeyWithOffset(new Date(), 1)}
        />
      </section>
    </main>
  );
}
