import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Movie Community Discussions",
  description:
    "Join PopScore movie discussions, fan debates, theories, recommendations, and review conversations.",
  alternates: {
    canonical: absoluteUrl("/community"),
  },
  openGraph: {
    title: "Movie Community Discussions",
    description:
      "Join PopScore movie discussions, fan debates, theories, recommendations, and review conversations.",
    type: "website",
    url: absoluteUrl("/community"),
  },
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
