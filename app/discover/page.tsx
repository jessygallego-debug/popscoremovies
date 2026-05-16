import SiteHeader from "@/app/components/site-header";
import DiscoverClient from "@/app/discover/discover-client";

export default function DiscoverPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-black bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,0.16),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_40%,#000_72%,#020617_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(rgba(250,204,21,0.28)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <SiteHeader />

        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(360px,0.72fr)_minmax(420px,1fr)] lg:items-center lg:py-14">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-yellow-400/25 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-yellow-300">
              Find your next rating
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.96] text-white sm:text-6xl xl:text-7xl">
              Discovery Built Around Genre
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-300">
              Browse genre-first movie picks and keep rated titles out of your
              recommendations when you are signed in.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-800/80 bg-[radial-gradient(circle_at_70%_15%,rgba(250,204,21,0.18),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(2,6,23,0.96))] p-6 shadow-2xl shadow-black/40">
            <div className="grid gap-4 sm:grid-cols-3">
              {["Pick Genre", "Save Movie", "Rate Next"].map((step, index) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/10 bg-black/35 p-5 text-center"
                >
                  <p className="text-4xl font-black text-yellow-300">
                    {index + 1}
                  </p>
                  <p className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-slate-300">
                    {step}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-sm font-bold leading-6 text-slate-300">
              The same PopScore discovery flow, now outside the profile stats
              page.
            </p>
          </div>
        </section>

        <DiscoverClient />
      </section>
    </main>
  );
}
