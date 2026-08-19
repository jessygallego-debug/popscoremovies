"use client";

import { getSupabaseAccessToken } from "@/lib/profile-store";

export type RecordedCommunityDiscussionReply = {
  commentCount: number;
  recorded: boolean;
  recipientUserId?: string;
  replyId?: string;
};

export async function recordCommunityDiscussionReply(input: {
  body: string;
  discussionId: string;
  replyId: string;
}) {
  const accessToken = await getSupabaseAccessToken().catch(() => null);

  if (!accessToken) {
    return null;
  }

  const response = await fetch("/api/community/discussions/replies", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  return response.json() as Promise<RecordedCommunityDiscussionReply>;
}
