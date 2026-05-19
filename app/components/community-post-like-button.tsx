"use client";

import { useEffect, useState } from "react";
import {
  getCommunityPostLikeSummary,
  toggleCommunityPostLike,
} from "@/lib/community-comments";
import type { CommunityPostLikeSummary } from "@/lib/community-comments";

type CommunityPostLikeButtonProps = {
  className?: string;
  initialLikeCount: number;
  postId: string;
};

function userFriendlyError(error: Error) {
  if (
    error.message.includes("404") ||
    error.message.includes("community_post_likes")
  ) {
    return "Likes are not available yet.";
  }

  return error.message || "Could not update likes. Please try again.";
}

export default function CommunityPostLikeButton({
  className = "",
  initialLikeCount,
  postId,
}: CommunityPostLikeButtonProps) {
  const [summary, setSummary] = useState<CommunityPostLikeSummary>({
    likedByCurrentUser: false,
    likeCount: initialLikeCount,
    postId,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    getCommunityPostLikeSummary(postId, initialLikeCount)
      .then((nextSummary) => {
        if (isCurrent) {
          setSummary(nextSummary);
          setMessage("");
        }
      })
      .catch(() => {
        if (isCurrent) {
          setSummary({
            likedByCurrentUser: false,
            likeCount: initialLikeCount,
            postId,
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [initialLikeCount, postId]);

  const handleLike = () => {
    setIsSaving(true);
    setMessage("");

    toggleCommunityPostLike(summary, initialLikeCount)
      .then((nextSummary) => {
        setSummary(nextSummary);
      })
      .catch((error: Error) => {
        setMessage(userFriendlyError(error));
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <button
        type="button"
        aria-label={
          summary.likedByCurrentUser ? "Unlike this post" : "Like this post"
        }
        aria-pressed={summary.likedByCurrentUser}
        disabled={isSaving}
        onClick={handleLike}
        className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-black transition ${
          summary.likedByCurrentUser
            ? "border-red-400/40 bg-red-500/15 text-red-200"
            : "border-slate-700 bg-black/25 text-slate-300 hover:border-yellow-400/60 hover:text-yellow-300"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className="text-red-400">♥</span>
        {summary.likeCount}
      </button>
      {message ? (
        <span className="text-xs font-bold text-yellow-300">{message}</span>
      ) : null}
    </div>
  );
}
