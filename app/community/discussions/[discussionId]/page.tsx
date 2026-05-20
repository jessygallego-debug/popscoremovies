import DiscussionDetailClient from "./discussion-detail-client";

export default async function DiscussionDetailPage({
  params,
}: {
  params: Promise<{ discussionId: string }>;
}) {
  const { discussionId } = await params;

  return <DiscussionDetailClient discussionId={discussionId} />;
}
