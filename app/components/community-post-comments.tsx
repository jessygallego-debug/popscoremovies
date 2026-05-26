"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  addCommunityComment,
  COMMUNITY_COMMENT_MAX_LENGTH,
  CommunityComment,
  getCommunityComments,
  notifyCommunityPostActivityUpdated,
  toggleCommunityCommentLike,
  validateCommunityComment,
} from "@/lib/community-comments";
import MentionTextarea from "@/app/components/mention-textarea";
import { NOTIFICATION_TARGET_CHANGED_EVENT } from "@/lib/notifications";
import ProfileUsernameLink from "@/app/components/profile-username-link";

type CommunityPostCommentsProps = {
  initialCommentCount: number;
  movieId?: string;
  movieTitle?: string;
  postOwnerUserId?: string;
  postOwnerUsername?: string;
  postId: string;
};

function formatCommentTime(createdAt: string) {
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) {
    return "";
  }

  const minutesAgo = Math.max(
    0,
    Math.floor((Date.now() - createdTime) / 60000)
  );

  if (minutesAgo < 1) {
    return "Just now";
  }

  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  const hoursAgo = Math.floor(minutesAgo / 60);

  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }

  return `${Math.floor(hoursAgo / 24)}d ago`;
}

function userFriendlyError(error: Error) {
  const message = error.message.toLowerCase();

  if (
    message.includes("string did not match the expected pattern") ||
    message.includes("failed to fetch") ||
    message.includes("load failed") ||
    message.includes("could not reach popscore")
  ) {
    return "Could not update comments. Please try again.";
  }

  if (
    error.message.includes("404") ||
    error.message.includes("community_comments") ||
    error.message.includes("community_comment_likes")
  ) {
    return "Comments are not available yet.";
  }

  return error.message || "Could not update comments. Please try again.";
}

function shouldKeepLocalLike(error: Error) {
  const message = error.message.toLowerCase();

  return (
    !message.includes("create or sign in") &&
    !message.includes("sign in") &&
    !message.includes("popfile")
  );
}

const NOTIFICATION_HIGHLIGHT_DURATION_MS = 4000;

type CommunityPostNotificationTarget = {
  commentId: string | null;
  key: string;
  movieId: string | null;
  replyId: string | null;
};

function currentLocationKey() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function hashPostId() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.location.hash.startsWith("#post-")) {
    return null;
  }

  return window.location.hash.replace("#post-", "");
}

function readCommunityPostNotificationTarget(
  postId: string
): CommunityPostNotificationTarget | null {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const targetPostId = searchParams.get("postId");

  if (targetPostId !== postId && hashPostId() !== postId) {
    return null;
  }

  const commentId = searchParams.get("commentId");
  const replyId = searchParams.get("replyId");
  const movieId = searchParams.get("movieId");

  return {
    commentId,
    key: `${postId}:${commentId ?? ""}:${replyId ?? ""}:${
      movieId ?? ""
    }:${currentLocationKey()}`,
    movieId,
    replyId,
  };
}

function getNotificationTargetElement(targetIds: string[]) {
  return targetIds
    .map((targetId) => document.getElementById(targetId))
    .find((element): element is HTMLElement => Boolean(element));
}

function scrollToNotificationTargetElement(targetElement: HTMLElement) {
  targetElement.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  targetElement.classList.add("notification-highlight");

  window.setTimeout(() => {
    targetElement.classList.remove("notification-highlight");
  }, NOTIFICATION_HIGHLIGHT_DURATION_MS);
}

function waitForNotificationTarget(
  targetIds: string[],
  fallbackIds: string[],
  onTargetFound?: () => void
) {
  let attempt = 0;
  let retryTimeout: number | null = null;
  const maxAttempts = 12;

  const tryScroll = () => {
    const targetElement =
      getNotificationTargetElement(targetIds) ??
      (attempt >= maxAttempts
        ? getNotificationTargetElement(fallbackIds)
        : null);

    if (targetElement) {
      onTargetFound?.();
      scrollToNotificationTargetElement(targetElement);
      return;
    }

    attempt += 1;

    if (attempt <= maxAttempts) {
      retryTimeout = window.setTimeout(tryScroll, 150);
    }
  };

  retryTimeout = window.setTimeout(tryScroll, 300);

  return () => {
    if (retryTimeout) {
      window.clearTimeout(retryTimeout);
    }
  };
}

export default function CommunityPostComments({
  initialCommentCount,
  movieId,
  movieTitle,
  postOwnerUserId,
  postOwnerUsername,
  postId,
}: CommunityPostCommentsProps) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [areCommentsOpen, setAreCommentsOpen] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingLikeId, setSavingLikeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [locationKey, setLocationKey] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handledNotificationTargetRef = useRef<string | null>(null);

  const totalCommentCount = initialCommentCount + comments.length;
  const visibleComments = showAllComments
    ? comments
    : comments.slice(-2);
  const hasExtraComments = comments.length > 2;
  const commentCountLabel = `${totalCommentCount} ${
    totalCommentCount === 1 ? "comment" : "comments"
  }`;
  const remainingCharacters = COMMUNITY_COMMENT_MAX_LENGTH - draft.length;
  const isDraftTooLong = remainingCharacters < 0;
  const validation = useMemo(() => validateCommunityComment(draft), [draft]);
  const validationMessage =
    draft.trim() && validation.error ? validation.error : "";

  useEffect(() => {
    let isCurrent = true;

    getCommunityComments(postId)
      .then((nextComments) => {
        if (isCurrent) {
          setComments(nextComments);
          setMessage("");
        }
      })
      .catch((error: Error) => {
        if (isCurrent) {
          setComments([]);
          setMessage(userFriendlyError(error));
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [postId]);

  useEffect(() => {
    if (isComposerOpen) {
      textareaRef.current?.focus();
    }
  }, [isComposerOpen]);

  useEffect(() => {
    const updateLocationKey = () => {
      setLocationKey(currentLocationKey());

      if (window.location.hash.startsWith(`#post-${postId}`)) {
        setAreCommentsOpen(true);
      }
    };

    updateLocationKey();
    window.addEventListener("hashchange", updateLocationKey);
    window.addEventListener("popstate", updateLocationKey);
    window.addEventListener(
      NOTIFICATION_TARGET_CHANGED_EVENT,
      updateLocationKey
    );

    return () => {
      window.removeEventListener("hashchange", updateLocationKey);
      window.removeEventListener("popstate", updateLocationKey);
      window.removeEventListener(
        NOTIFICATION_TARGET_CHANGED_EVENT,
        updateLocationKey
      );
    };
  }, [postId]);

  useEffect(() => {
    const target = readCommunityPostNotificationTarget(postId);

    if (!target) {
      return;
    }

    const openTimeout = window.setTimeout(() => {
      setAreCommentsOpen(true);

      if (target.commentId || target.replyId) {
        setShowAllComments(true);
      }
    }, 0);

    if (isLoading) {
      return () => {
        window.clearTimeout(openTimeout);
      };
    }

    if (handledNotificationTargetRef.current === target.key) {
      return () => {
        window.clearTimeout(openTimeout);
      };
    }

    const targetIds = [
      target.replyId ? `reply-${target.replyId}` : null,
      target.commentId ? `comment-${target.commentId}` : null,
    ].filter((targetId): targetId is string => Boolean(targetId));
    const fallbackIds = [`post-${postId}`];
    const cancelTargetWait = waitForNotificationTarget(
      targetIds.length > 0 ? targetIds : fallbackIds,
      fallbackIds,
      () => {
        handledNotificationTargetRef.current = target.key;
      }
    );

    return () => {
      window.clearTimeout(openTimeout);
      cancelTargetWait();
    };
  }, [comments.length, isLoading, locationKey, postId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (validation.error) {
      setMessage(validation.error);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    addCommunityComment(postId, draft, {
      movieId,
      movieTitle,
      recipientUserId: postOwnerUserId,
      recipientUsername: postOwnerUsername,
    })
      .then((nextComments) => {
        setComments(nextComments);
        setDraft("");
        setIsComposerOpen(false);
        setAreCommentsOpen(true);
        notifyCommunityPostActivityUpdated(postId);
      })
      .catch((error: Error) => {
        setMessage(userFriendlyError(error));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleLike = (comment: CommunityComment) => {
    const nextLikedByCurrentUser = !comment.likedByCurrentUser;
    const updateCommentLike = (likedByCurrentUser: boolean) => {
      setComments((currentComments) =>
        currentComments.map((currentComment) => {
          if (currentComment.id !== comment.id) {
            return currentComment;
          }

          const wasLiked = currentComment.likedByCurrentUser;

          if (wasLiked === likedByCurrentUser) {
            return currentComment;
          }

          return {
            ...currentComment,
            likedByCurrentUser,
            likeCount: Math.max(
              0,
              currentComment.likeCount + (likedByCurrentUser ? 1 : -1)
            ),
          };
        })
      );
    };

    setSavingLikeId(comment.id);
    setMessage("");
    updateCommentLike(nextLikedByCurrentUser);

    toggleCommunityCommentLike(comment, { movieId, movieTitle })
      .then((nextComments) => {
        setComments(nextComments);
      })
      .catch((error: Error) => {
        if (shouldKeepLocalLike(error)) {
          setMessage("");
          return;
        }

        updateCommentLike(comment.likedByCurrentUser);
        setMessage(userFriendlyError(error));
      })
      .finally(() => {
        setSavingLikeId(null);
      });
  };

  return (
    <>
      <div className="flex min-h-9 flex-wrap items-center gap-2 text-xs font-black text-slate-400">
        {totalCommentCount > 0 ? (
          <button
            type="button"
            aria-expanded={areCommentsOpen}
            onClick={() => {
              setAreCommentsOpen((isOpen) => !isOpen);
              setShowAllComments(false);
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-700 bg-black/25 px-3 transition hover:border-yellow-400/50 hover:text-yellow-300"
          >
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 6.5h14v9H8.5L5 19v-3.5Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            {areCommentsOpen ? "Hide comments" : `View ${commentCountLabel}`}
          </button>
        ) : (
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-700 bg-black/25 px-3">
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 6.5h14v9H8.5L5 19v-3.5Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            0 comments
          </span>
        )}
        <button
          type="button"
          aria-expanded={isComposerOpen}
          onClick={() => {
            setIsComposerOpen((isOpen) => !isOpen);
            setMessage("");
          }}
          className="inline-flex min-h-9 items-center rounded-full border border-slate-700 bg-black/25 px-3 text-slate-200 transition hover:border-yellow-400/50 hover:text-yellow-300"
        >
          Comment
        </button>
        {isLoading ? <span>Loading...</span> : null}
      </div>

      {areCommentsOpen || isComposerOpen || message || validationMessage ? (
        <div className="basis-full border-t border-white/10 pt-2">
          {areCommentsOpen && visibleComments.length > 0 ? (
            <div className="space-y-2">
              {visibleComments.map((comment) => (
                <div
                  id={`comment-${comment.id}`}
                  key={comment.id}
                  className="flex scroll-mt-28 items-start gap-3 rounded-xl transition"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10 text-sm font-black text-white">
                    {comment.avatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <ProfileUsernameLink
                        username={comment.username}
                        className="text-sm font-black text-white"
                      >
                        @{comment.username}
                      </ProfileUsernameLink>
                      <span className="text-[11px] font-bold text-slate-500">
                        {formatCommentTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-300">
                      {comment.body}
                    </p>
                    <button
                      type="button"
                      aria-pressed={comment.likedByCurrentUser}
                      aria-label={
                        comment.likedByCurrentUser
                          ? "Unlike this comment"
                          : "Like this comment"
                      }
                      disabled={savingLikeId === comment.id}
                      onClick={() => handleLike(comment)}
                      className={`mt-2 inline-flex min-h-8 items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-xs font-black shadow-lg transition ${
                        comment.likedByCurrentUser
                          ? "border-red-400/55 bg-red-500/18 text-red-100 shadow-red-500/10"
                          : "border-slate-700 bg-black/25 text-slate-300 shadow-black/20 hover:border-red-400/50 hover:text-red-200"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full transition ${
                          comment.likedByCurrentUser
                            ? "bg-red-500 text-white"
                            : "bg-red-500/10 text-red-300"
                        }`}
                      >
                        <svg
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 ${
                            comment.likedByCurrentUser
                              ? "fill-current"
                              : "fill-transparent"
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
                      {comment.likeCount}
                    </button>
                  </div>
                </div>
              ))}
              {hasExtraComments ? (
                <button
                  type="button"
                  onClick={() => setShowAllComments((isShowingAll) => !isShowingAll)}
                  className="text-xs font-black text-yellow-300 transition hover:text-yellow-200"
                >
                  {showAllComments ? "Show fewer comments" : "View all comments"}
                </button>
              ) : null}
            </div>
          ) : null}

          {isComposerOpen ? (
            <form onSubmit={handleSubmit} className="mt-2">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_136px] sm:items-stretch">
                <label className="block">
                  <span className="sr-only">Add a comment</span>
                  <MentionTextarea
                    inputRef={textareaRef}
                    value={draft}
                    maxLength={COMMUNITY_COMMENT_MAX_LENGTH + 20}
                    onChange={(nextDraft) => {
                      setDraft(nextDraft);
                      setMessage("");
                    }}
                    placeholder="Add a comment..."
                    className="h-11 w-full resize-none rounded-xl border border-slate-800 bg-black/35 px-3 py-2 text-sm font-semibold leading-5 text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70 sm:h-12"
                  />
                </label>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    isDraftTooLong ||
                    !draft.trim() ||
                    Boolean(validationMessage)
                  }
                  className="h-11 rounded-xl bg-yellow-400 px-4 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none sm:h-12"
                >
                  {isSubmitting ? "Posting..." : "Comment"}
                </button>
              </div>
              {draft ? (
                <p
                  className={`mt-1 text-xs font-bold ${
                    isDraftTooLong ? "text-red-300" : "text-slate-500"
                  }`}
                >
                  {Math.max(remainingCharacters, 0)} characters left
                </p>
              ) : null}
            </form>
          ) : null}

          {message || validationMessage ? (
            <p className="mt-2 text-xs font-bold text-yellow-300">
              {message || validationMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
