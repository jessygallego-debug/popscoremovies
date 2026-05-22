import SiteHeader from "@/app/components/site-header";
import DiscoverClient from "@/app/discover/discover-client";
import { PROFILE_GENRES, normalizeProfileGenreKey } from "@/lib/profile-config";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const params = await searchParams;
  const initialGenre =
    normalizeProfileGenreKey(params.genre) || PROFILE_GENRES[0].key;

  return (
    <main className="min-h-screen overflow-hidden bg-black bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,0.16),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_40%,#000_72%,#020617_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(rgba(250,204,21,0.28)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <SiteHeader />

        <section className="grid gap-5 py-7 sm:gap-8 sm:py-10 lg:grid-cols-[minmax(360px,0.72fr)_minmax(420px,1fr)] lg:items-center lg:py-14">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-yellow-300 sm:mb-5 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.18em]">
              Personalized Picks
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-[0.98] text-white sm:text-6xl xl:text-7xl">
              Discover Movies You&rsquo;ll Actually Love
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:mt-5 sm:text-lg sm:leading-8">
              Pick a genre and get personalized movie recommendations.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-800/80 bg-[radial-gradient(circle_at_70%_15%,rgba(250,204,21,0.18),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(2,6,23,0.96))] p-4 shadow-2xl shadow-black/40 sm:rounded-[2rem] sm:p-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {["Choose Genre", "Get Movie Matches", "Rate & Refine"].map((step, index) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/10 bg-black/35 p-3 text-center sm:p-5"
                >
                  <p className="text-2xl font-black text-yellow-300 sm:text-4xl">
                    {index + 1}
                  </p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 sm:mt-2 sm:text-sm sm:tracking-[0.16em]">
                    {step}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs font-bold leading-5 text-slate-300 sm:mt-5 sm:text-sm sm:leading-6">
              The same PopScore discovery flow, now outside the PopFile stats
              page.
            </p>
          </div>
        </section>

        <DiscoverClient initialGenre={initialGenre} />
      </section>
    </main>
  );
}
