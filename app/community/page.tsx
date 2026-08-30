import { Suspense } from "react";
import CommunityClient from "@/app/community/community-client";
import { getCommunityOverview } from "@/lib/community-overview";

function CommunityLoading() {
  return (
    <main
      aria-live="polite"
      className="min-h-screen bg-black px-5 py-8 text-white sm:px-8"
      role="status"
    >
      <span className="sr-only">Loading the PopScore community...</span>
      <div className="mx-auto max-w-[1500px] animate-pulse space-y-6">
        <div className="h-12 w-52 rounded-2xl bg-slate-900" />
        <div className="h-36 rounded-3xl bg-slate-900/80" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <div className="h-40 rounded-3xl bg-slate-900/80" />
            <div className="h-72 rounded-3xl bg-slate-900/80" />
          </div>
          <div className="h-80 rounded-3xl bg-slate-900/80" />
        </div>
      </div>
    </main>
  );
}

async function CommunityContent() {
  const initialCommunityData = await getCommunityOverview().catch(() => ({
    ratings: [],
    reviewers: [],
    users: [],
  }));

  return <CommunityClient initialCommunityData={initialCommunityData} />;
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<CommunityLoading />}>
      <CommunityContent />
    </Suspense>
  );
}
