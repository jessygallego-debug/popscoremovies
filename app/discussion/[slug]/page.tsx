import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DiscussionDetailPageContent, {
  generateDiscussionMetadata,
} from "@/app/community/discussions/discussion-detail-page";
import { mockCommunityDiscussions } from "@/lib/community-discussions";
import { discussionIdFromSlug, discussionSlug } from "@/lib/urls";

export function generateStaticParams() {
  return mockCommunityDiscussions.map((discussion) => ({
    slug: discussionSlug(discussion),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return generateDiscussionMetadata(discussionIdFromSlug(slug));
}

export default async function SeoDiscussionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const discussionId = discussionIdFromSlug(slug);

  if (!discussionId) {
    notFound();
  }

  return <DiscussionDetailPageContent discussionId={discussionId} />;
}
