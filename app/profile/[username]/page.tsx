import type { Metadata } from "next";
import ProfileTabs from "@/app/components/profile-tabs";
import SiteHeader from "@/app/components/site-header";
import { getPublicProfileForSeo } from "@/lib/seo-data";
import { absoluteUrl } from "@/lib/site-url";

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
    <main className="min-h-screen bg-[#081020] bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.08),transparent_30%),radial-gradient(circle_at_75%_20%,rgba(59,130,246,0.08),transparent_34%),linear-gradient(180deg,#081020_0%,#060c18_55%,#081020_100%)] px-3 py-4 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-[1800px]">
        <SiteHeader showSearch />
        <div className="mt-4 sm:mt-6">
          <ProfileTabs username={username} />
        </div>
      </section>
    </main>
  );
}
