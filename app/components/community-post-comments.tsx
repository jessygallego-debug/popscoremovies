"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addCommunityComment,
  COMMUNITY_COMMENT_MAX_LENGTH,
  CommunityComment,
  getCommunityComments,
  toggleCommunityCommentLike,
  validateCommunityComment,
} from "@/lib/community-comments";

type CommunityPostCommentsProps = {
  initialCommentCount: number;
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
  if (
    error.message.includes("404") ||
    error.message.includes("community_comments") ||
    error.message.includes("community_comment_likes")
  ) {
    return "Comments are not available yet.";
  }

  return error.message || "Could not update comments. Please try again.";
}

export default function CommunityPostComments({
  initialCommentCount,
  postId,
}: CommunityPostCommentsProps) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingLikeId, setSavingLikeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const totalCommentCount = initialCommentCount + comments.length;
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (validation.error) {
      setMessage(validation.error);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    addCommunityComment(postId, draft)
      .then((nextComments) => {
        setComments(nextComments);
        setDraft("");
      })
      .catch((error: Error) => {
        setMessage(userFriendlyError(error));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleLike = (comment: CommunityComment) => {
    setSavingLikeId(comment.id);
    setMessage("");

    toggleCommunityCommentLike(comment)
      .then((nextComments) => {
        setComments(nextComments);
      })
      .catch((error: Error) => {
        setMessage(userFriendlyError(error));
      })
      .finally(() => {
        setSavingLikeId(null);
      });
  };

  return (
    <section className="mt-3 border-t border-white/10 pt-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-slate-400">
        <span>{totalCommentCount} comments</span>
        {isLoading ? <span>Loading...</span> : null}
      </div>

      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10 text-sm font-black text-white">
                {comment.avatar}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm font-black text-white">
                    @{comment.username}
                  </span>
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
                  disabled={comment.isOwnComment || savingLikeId === comment.id}
                  onClick={() => handleLike(comment)}
                  className={`mt-2 inline-flex items-center gap-2 text-xs font-black transition ${
                    comment.likedByCurrentUser
                      ? "text-red-300"
                      : "text-slate-400 hover:text-yellow-300"
                  } disabled:cursor-not-allowed disabled:text-slate-600`}
                >
                  <span className="text-red-400">♥</span>
                  {comment.likeCount}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-2">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="sr-only">Add a comment</span>
            <textarea
              value={draft}
              maxLength={COMMUNITY_COMMENT_MAX_LENGTH + 20}
              onChange={(event) => {
                setDraft(event.target.value);
                setMessage("");
              }}
              placeholder="Add a comment..."
              className="min-h-14 w-full resize-none rounded-xl border border-slate-800 bg-black/35 px-3 py-2 text-sm font-semibold leading-5 text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70 sm:min-h-16"
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
            className="min-h-11 rounded-xl bg-yellow-400 px-4 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
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

      {message || validationMessage ? (
        <p className="mt-2 text-xs font-bold text-yellow-300">
          {message || validationMessage}
        </p>
      ) : null}
    </section>
  );
}
