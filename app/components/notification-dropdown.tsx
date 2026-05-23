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
    <div className="absolute right-0 z-[1400] mt-2 w-[min(calc(100vw-4rem),20rem)] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/95 p-2 shadow-2xl shadow-black/60 backdrop-blur sm:mt-3 sm:w-96 sm:max-w-sm sm:rounded-3xl sm:p-3">
      <div className="mb-2 flex items-center justify-between gap-3 px-1 sm:mb-3">
        <h2 className="text-base font-black text-white sm:text-lg">
          Notifications
        </h2>
        <Link
          href="/notifications"
          className="text-xs font-black text-yellow-300 transition hover:text-yellow-200"
        >
          View all
        </Link>
      </div>

      <div className="max-h-[52vh] space-y-1.5 overflow-y-auto sm:max-h-96 sm:space-y-2">
        {isLoading ? (
          <p className="rounded-2xl border border-slate-800 bg-black/20 p-3 text-xs font-bold text-slate-400 sm:p-4 sm:text-sm">
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
          <p className="rounded-2xl border border-slate-800 bg-black/20 p-3 text-xs font-bold text-slate-400 sm:p-4 sm:text-sm">
            No notifications yet.
          </p>
        )}
      </div>

      <Link
        href="/notifications"
        className="mt-2 block rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-3 py-2.5 text-center text-xs font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-black sm:mt-3 sm:px-4 sm:py-3 sm:text-sm"
      >
        View all notifications
      </Link>
    </div>
  );
}
