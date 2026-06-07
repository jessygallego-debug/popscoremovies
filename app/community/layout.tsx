import type { Metadata } from "next";
import {
  SITE_ICON_ALT,
  SITE_ICON_PATH,
  SITE_KEYWORDS,
} from "@/lib/site-metadata";
import { absoluteUrl } from "@/lib/site-url";

const communityTitle = "Movie Community, Reviews, and Discussions | PopScore";
const communityDescription =
  "Join PopScore fans to discuss movies, share reviews, follow movie lovers, and see what people are rating, watching, and recommending.";
const communityImage = {
  url: absoluteUrl(SITE_ICON_PATH),
  width: 256,
  height: 256,
  alt: SITE_ICON_ALT,
};

export const metadata: Metadata = {
  title: { absolute: communityTitle },
  description: communityDescription,
  keywords: [
    "movie community",
    "movie reviews and ratings",
    "movie discussions",
    "fan movie reviews",
    ...SITE_KEYWORDS,
  ],
  alternates: {
    canonical: absoluteUrl("/community"),
  },
  openGraph: {
    title: communityTitle,
    description: communityDescription,
    images: [communityImage],
    type: "website",
    url: absoluteUrl("/community"),
  },
  twitter: {
    card: "summary",
    title: communityTitle,
    description: communityDescription,
    images: [communityImage],
  },
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
