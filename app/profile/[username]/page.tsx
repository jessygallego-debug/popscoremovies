import type { Metadata } from "next";
import BrandHomeLink from "@/app/components/brand-home-link";
import ProfileTabs from "@/app/components/profile-tabs";
import { getPublicProfileForSeo } from "@/lib/seo-data";
import { absoluteUrl } from "@/lib/site-url";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileForSeo(username);
  const displayUsername = profile?.username ?? username;
  const title = `@${displayUsername} PopFile`;
  const description = `See @${displayUsername}'s PopScore profile, favorite movie genres, ratings, watch activity, and fan reviews.`;
  const canonical = absoluteUrl(
    `/profile/${encodeURIComponent(displayUsername)}`
  );

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "profile",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <main className="min-h-screen bg-black bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.12),transparent_34%),linear-gradient(180deg,#020617_0%,#000_50%,#020617_100%)] px-4 py-5 text-white sm:px-8 sm:py-12">
      <section className="mx-auto max-w-[1500px]">
        <div className="flex items-start justify-between gap-4">
          <BrandHomeLink />
          <Link
            href="/"
            aria-label="Exit PopFile screen"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black text-gray-300 transition hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-300"
          >
            X
          </Link>
        </div>
        <div className="mt-6 sm:mt-10">
          <ProfileTabs username={username} />
        </div>
      </section>
    </main>
  );
}
