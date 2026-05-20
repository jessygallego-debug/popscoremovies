"use client";

import { useEffect, useState } from "react";
import {
  getCommunityPostLikeSummary,
  toggleCommunityPostLike,
} from "@/lib/community-comments";
import type { CommunityPostLikeSummary } from "@/lib/community-comments";
import {
  createNotification,
  getCurrentNotificationActor,
  type NotificationEntityType,
} from "@/lib/notifications";

type CommunityPostLikeButtonProps = {
  className?: string;
  initialLikeCount: number;
  notificationEntityId?: string;
  notificationEntityType?: NotificationEntityType;
  notificationMovieTitle?: string;
  notificationRecipientUserId?: string;
  notificationRecipientUsername?: string;
  postId: string;
};

function userFriendlyError(error: Error) {
  const message = error.message.toLowerCase();

  if (
    message.includes("string did not match the expected pattern") ||
    message.includes("failed to fetch") ||
    message.includes("load failed") ||
    message.includes("could not reach popscore")
  ) {
    return "Could not update likes. Please try again.";
  }

  if (
    error.message.includes("404") ||
    error.message.includes("community_post_likes")
  ) {
    return "Likes are not available yet.";
  }

  return error.message || "Could not update likes. Please try again.";
}

function shouldKeepLocalLike(error: Error) {
  const message = error.message.toLowerCase();

  return (
    !message.includes("create or sign in") &&
    !message.includes("sign in") &&
    !message.includes("popfile")
  );
}

export default function CommunityPostLikeButton({
  className = "",
  initialLikeCount,
  notificationEntityId,
  notificationEntityType = "review",
  notificationMovieTitle,
  notificationRecipientUserId,
  notificationRecipientUsername,
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
    const currentSummary = summary;
    const isCreatingLike = !currentSummary.likedByCurrentUser;
    const optimisticSummary = {
      ...currentSummary,
      likedByCurrentUser: !currentSummary.likedByCurrentUser,
      likeCount: Math.max(
        0,
        currentSummary.likeCount + (currentSummary.likedByCurrentUser ? -1 : 1)
      ),
    };

    setIsSaving(true);
    setMessage("");
    setSummary(optimisticSummary);

    const createLikeNotification = async () => {
      if (!isCreatingLike || !notificationRecipientUserId) {
        return;
      }

      const actor = await getCurrentNotificationActor();
      const movieText = notificationMovieTitle
        ? ` of ${notificationMovieTitle}`
        : "";

      await createNotification({
        actorUserId: actor.userId,
        actorUsername: actor.username,
        entityId: notificationEntityId ?? postId,
        entityType: notificationEntityType,
        message: `${actor.displayName} liked your review${movieText}.`,
        recipientUserId: notificationRecipientUserId,
        recipientUsername: notificationRecipientUsername,
        type: "comment_reaction",
      });
    };

    toggleCommunityPostLike(currentSummary, initialLikeCount)
      .then((nextSummary) => {
        setSummary(nextSummary);
        void createLikeNotification();
      })
      .catch((error: Error) => {
        if (shouldKeepLocalLike(error)) {
          setMessage("");
          void createLikeNotification();
          return;
        }

        setSummary(currentSummary);
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
        className={`inline-flex min-h-9 items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-sm font-black shadow-lg transition ${
          summary.likedByCurrentUser
            ? "border-red-400/55 bg-red-500/18 text-red-100 shadow-red-500/10"
            : "border-slate-700 bg-black/25 text-slate-300 shadow-black/20 hover:border-red-400/50 hover:text-red-200"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition ${
            summary.likedByCurrentUser
              ? "bg-red-500 text-white"
              : "bg-red-500/10 text-red-300"
          }`}
        >
          <svg
            aria-hidden="true"
            className={`h-4 w-4 ${
              summary.likedByCurrentUser ? "fill-current" : "fill-transparent"
            }`}
            viewBox="0 0 24 24"
          >
            <path
              d="M20.4 5.2c-1.7-1.8-4.5-1.8-6.3 0L12 7.3 9.9 5.2c-1.8-1.8-4.6-1.8-6.3 0-1.8 1.9-1.7 4.8.1 6.7L12 20l8.3-8.1c1.8-1.9 1.9-4.8.1-6.7Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </span>
        {summary.likeCount}
      </button>
      {message ? (
        <span className="text-xs font-bold text-yellow-300">{message}</span>
      ) : null}
    </div>
  );
}
