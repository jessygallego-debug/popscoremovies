import type { Metadata } from "next";
import SiteHeader from "@/app/components/site-header";
import StreamingBrowser from "./streaming-browser";

export const metadata: Metadata = { title: "Streaming Movies | PopScore", description: "Find movies included with your streaming services.", alternates: { canonical: "/streaming" } };

export default function StreamingPage() {
  return <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8"><div className="mx-auto max-w-[1500px]">
    <SiteHeader />
    <section className="py-8"><h1 className="text-3xl font-black sm:text-5xl">Streaming Movies</h1>
      <p className="mt-3 mb-8 text-slate-300">Find your next movie on the services you already have.</p>
      <StreamingBrowser />
      <p className="mt-8 text-xs leading-6 text-slate-400">Streaming availability provided by JustWatch via TMDB. Catalogs vary by country and subscription plan and may change. Confirm availability with your service.</p>
    </section>
  </div></main>;
}
