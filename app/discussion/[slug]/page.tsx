import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DiscussionDetailPageContent, {
  generateDiscussionMetadata,
} from "@/app/community/discussions/discussion-detail-page";
import { discussionIdFromSlug } from "@/lib/urls";

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
