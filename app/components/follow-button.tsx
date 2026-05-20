"use client";

import { useEffect, useState } from "react";
import {
  FOLLOWS_UPDATED_EVENT,
  getFollowSummary,
  toggleFollow,
  type FollowSummary,
  type FollowTarget,
} from "@/lib/follows";

type FollowButtonProps = {
  className?: string;
  onFollowChange?: (summary: FollowSummary) => void;
  size?: "sm" | "md";
  target: FollowTarget;
};

const defaultSummary: FollowSummary = {
  currentUserId: null,
  followersCount: 0,
  followingCount: 0,
  isFollowing: false,
  isOwnProfile: false,
};

export default function FollowButton({
  className = "",
  onFollowChange,
  size = "md",
  target,
}: FollowButtonProps) {
  const targetDisplayName = target.displayName;
  const targetUserId = target.userId;
  const targetUsername = target.username;
  const [summary, setSummary] = useState<FollowSummary>(defaultSummary);
  const [isHovering, setIsHovering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;
    const currentTarget = {
      displayName: targetDisplayName,
      userId: targetUserId,
      username: targetUsername,
    };

    const loadSummary = () => {
      getFollowSummary(currentTarget)
        .then((nextSummary) => {
          if (!isCurrent) {
            return;
          }

          setSummary(nextSummary);
          onFollowChange?.(nextSummary);
          setMessage("");
        })
        .catch(() => {
          if (isCurrent) {
            setSummary(defaultSummary);
          }
        })
        .finally(() => {
          if (isCurrent) {
            setIsLoading(false);
          }
        });
    };

    loadSummary();

    window.addEventListener(FOLLOWS_UPDATED_EVENT, loadSummary);

    return () => {
      isCurrent = false;
      window.removeEventListener(FOLLOWS_UPDATED_EVENT, loadSummary);
    };
  }, [onFollowChange, targetDisplayName, targetUserId, targetUsername]);

  const followLabel = summary.isFollowing
    ? isHovering
      ? "Unfollow"
      : "Following"
    : "Follow";
  const buttonLabel = summary.isOwnProfile ? "You" : followLabel;
  const sizeClass =
    size === "sm"
      ? "min-h-9 px-4 py-2 text-xs"
      : "min-h-11 px-5 py-2.5 text-sm";

  const handleClick = () => {
    if (summary.isOwnProfile || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    toggleFollow({
      displayName: targetDisplayName,
      userId: targetUserId,
      username: targetUsername,
    })
      .then((nextSummary) => {
        setSummary(nextSummary);
        onFollowChange?.(nextSummary);
      })
      .catch((error: Error) => {
        setMessage(error.message || "Could not update follow.");
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        disabled={summary.isOwnProfile || isLoading || isSaving}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={`inline-flex items-center justify-center rounded-xl border font-black shadow-lg transition ${sizeClass} ${
          summary.isFollowing
            ? isHovering
              ? "border-red-400/60 bg-red-500/15 text-red-100 shadow-red-500/10"
              : "border-yellow-400/45 bg-yellow-400/12 text-yellow-200 shadow-yellow-400/10"
            : "border-yellow-400/65 bg-yellow-400 text-black shadow-yellow-400/20 hover:bg-yellow-300"
        } disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/70 disabled:text-slate-500 disabled:shadow-black/10`}
      >
        {isSaving ? "Saving..." : buttonLabel}
      </button>
      {message ? (
        <span className="max-w-44 text-[11px] font-bold leading-4 text-red-200">
          {message}
        </span>
      ) : null}
    </div>
  );
}
