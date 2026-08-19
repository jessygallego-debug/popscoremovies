"use client";

import { getSupabaseAccessToken } from "@/lib/profile-store";

export type AchievementEmailCheckInput =
  | { type?: "self" }
  | { recipientUserId: string; type: "new_follower" }
  | { commentId: string; recipientUserId: string; type: "comment_like" }
  | { postId: string; recipientUserId: string; type: "post_like" }
  | {
      discussionId: string;
      recipientUserId: string;
      replyId: string;
      type: "discussion_reply";
    };

export async function checkAchievementEmails(
  input: AchievementEmailCheckInput = { type: "self" }
) {
  const accessToken = await getSupabaseAccessToken().catch(() => null);

  if (!accessToken) {
    return;
  }

  await fetch("/api/email/achievements", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  }).catch((error) => {
    console.warn("Could not check achievement emails.", error);
  });
}
