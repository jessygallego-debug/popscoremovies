import type { Metadata } from "next";
import DiscussionDetailPageContent, {
  generateDiscussionMetadata,
} from "@/app/community/discussions/discussion-detail-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ discussionId: string }>;
}): Promise<Metadata> {
  const { discussionId } = await params;

  return generateDiscussionMetadata(discussionId);
}

export default async function DiscussionDetailPage({
  params,
}: {
  params: Promise<{ discussionId: string }>;
}) {
  const { discussionId } = await params;

  return <DiscussionDetailPageContent discussionId={discussionId} />;
}
