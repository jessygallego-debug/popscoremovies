import type { Metadata } from "next";
import BrandHomeLink from "@/app/components/brand-home-link";
import MonthlyWatchlistUnsubscribe from "@/app/unsubscribe/monthly-watchlist/unsubscribe-client";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Monthly Watchlist Email Preferences",
};

export default async function MonthlyWatchlistUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8 sm:py-12">
      <section className="mx-auto max-w-xl">
        <BrandHomeLink />
        <MonthlyWatchlistUnsubscribe token={token} />
      </section>
    </main>
  );
}
