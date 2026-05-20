"use client";

import Link from "next/link";
import NotificationItem from "@/app/components/notification-item";
import type { PopScoreNotification } from "@/lib/notifications";

type NotificationDropdownProps = {
  isLoading?: boolean;
  notifications: PopScoreNotification[];
  onSelect: (notification: PopScoreNotification) => void;
};

export default function NotificationDropdown({
  isLoading = false,
  notifications,
  onSelect,
}: NotificationDropdownProps) {
  return (
    <div className="absolute right-0 z-50 mt-3 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/95 p-3 shadow-2xl shadow-black/60 backdrop-blur sm:w-96">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="text-lg font-black text-white">Notifications</h2>
        <Link
          href="/notifications"
          className="text-xs font-black text-yellow-300 transition hover:text-yellow-200"
        >
          View all
        </Link>
      </div>

      <div className="max-h-[70vh] space-y-2 overflow-y-auto sm:max-h-96">
        {isLoading ? (
          <p className="rounded-2xl border border-slate-800 bg-black/20 p-4 text-sm font-bold text-slate-400">
            Loading notifications...
          </p>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onSelect={onSelect}
            />
          ))
        ) : (
          <p className="rounded-2xl border border-slate-800 bg-black/20 p-4 text-sm font-bold text-slate-400">
            No notifications yet.
          </p>
        )}
      </div>

      <Link
        href="/notifications"
        className="mt-3 block rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-center text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
      >
        View all notifications
      </Link>
    </div>
  );
}
