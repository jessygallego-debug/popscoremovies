"use client";

import type { PopScoreNotification } from "@/lib/notifications";

type NotificationItemProps = {
  notification: PopScoreNotification;
  onSelect?: (notification: PopScoreNotification) => void;
};

function formatNotificationTime(value: string) {
  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return "";
  }

  const minutesAgo = Math.max(0, Math.floor((Date.now() - time) / 60000));

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

function notificationTypeLabel(type: PopScoreNotification["type"]) {
  const labels: Record<PopScoreNotification["type"], string> = {
    comment_reaction: "Reaction",
    comment_reply: "Reply",
    discussion_comment: "Discussion",
    follow: "Follow",
    mention: "Mention",
    new_follower: "New follower",
  };

  return labels[type];
}

export default function NotificationItem({
  notification,
  onSelect,
}: NotificationItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(notification)}
      className={`block w-full rounded-2xl border px-2.5 py-2.5 text-left transition sm:px-3 sm:py-3 ${
        notification.isRead
          ? "border-slate-800 bg-black/20 hover:border-yellow-400/40 hover:bg-yellow-400/5"
          : "border-yellow-400/25 bg-yellow-400/10 hover:border-yellow-400/60 hover:bg-yellow-400/15"
      }`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span
          aria-hidden="true"
          className={`mt-1 h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5 ${
            notification.isRead ? "bg-slate-700" : "bg-yellow-400"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold leading-5 text-white sm:text-sm">
            {notification.message}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-black text-slate-500 sm:mt-2 sm:gap-2 sm:text-xs">
            <span>{notificationTypeLabel(notification.type)}</span>
            <span aria-hidden="true">•</span>
            <span>{formatNotificationTime(notification.createdAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
