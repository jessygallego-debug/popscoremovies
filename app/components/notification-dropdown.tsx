"use client";

import Link from "next/link";
import NotificationItem from "@/app/components/notification-item";
import type { PopScoreNotification } from "@/lib/notifications";

type NotificationDropdownProps = {
  canClearNotifications?: boolean;
  isLoading?: boolean;
  isClearingNotifications?: boolean;
  notifications: PopScoreNotification[];
  onClearNotifications: () => void;
  onSelect: (notification: PopScoreNotification) => void;
};

export default function NotificationDropdown({
  canClearNotifications = false,
  isLoading = false,
  isClearingNotifications = false,
  notifications,
  onClearNotifications,
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

      <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3">
        <Link
          href="/notifications"
          className="flex min-h-11 items-center justify-center rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-2 py-2 text-center text-[10px] font-black leading-4 text-yellow-300 transition hover:bg-yellow-400 hover:text-black sm:min-h-12 sm:px-3 sm:text-xs"
        >
          View all notifications
        </Link>
        <button
          type="button"
          disabled={!canClearNotifications || isClearingNotifications}
          onClick={onClearNotifications}
          className="flex min-h-11 items-center justify-center rounded-2xl border border-slate-700/90 bg-slate-900/90 px-2 py-2 text-center text-[10px] font-black leading-4 text-slate-200 transition hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-200 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-12 sm:px-3 sm:text-xs"
        >
          {isClearingNotifications ? "Clearing..." : "Clear Notifications"}
        </button>
      </div>
    </div>
  );
}
