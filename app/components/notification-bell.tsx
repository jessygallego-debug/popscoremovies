"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NotificationDropdown from "@/app/components/notification-dropdown";
import {
  getCurrentNotificationUserId,
  getNotificationHref,
  getNotificationsForUser,
  markNotificationAsRead,
  NOTIFICATIONS_UPDATED_EVENT,
  type PopScoreNotification,
} from "@/lib/notifications";

type NotificationBellProps = {
  className?: string;
};

function BellIcon({ hasUnread }: { hasUnread: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-5 w-5 transition ${
        hasUnread ? "fill-yellow-400 text-yellow-400" : "fill-transparent"
      }`}
      viewBox="0 0 24 24"
    >
      <path
        d="M18 10.5V9a6 6 0 0 0-12 0v1.5c0 3.1-1.4 4.7-2.4 5.6-.6.6-.2 1.6.7 1.6h15.4c.9 0 1.3-1 .7-1.6-1-.9-2.4-2.5-2.4-5.6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M9.8 20a2.5 2.5 0 0 0 4.4 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function NotificationBell({
  className = "",
}: NotificationBellProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PopScoreNotification[]>(
    []
  );
  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    let isCurrent = true;

    const loadNotifications = async () => {
      const nextUserId = await getCurrentNotificationUserId();
      const nextNotifications = await getNotificationsForUser(nextUserId, 8);

      if (isCurrent) {
        setUserId(nextUserId);
        setNotifications(nextNotifications);
        setIsLoading(false);
      }
    };

    void loadNotifications();

    const refreshNotifications = () => {
      void loadNotifications();
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications);
    window.addEventListener("focus", refreshNotifications);
    document.addEventListener("visibilitychange", refreshNotifications);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    const refreshInterval = window.setInterval(refreshNotifications, 15000);

    return () => {
      isCurrent = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener(
        NOTIFICATIONS_UPDATED_EVENT,
        refreshNotifications
      );
      window.removeEventListener("focus", refreshNotifications);
      document.removeEventListener("visibilitychange", refreshNotifications);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const refreshNotifications = async () => {
    setIsLoading(true);
    const nextUserId = await getCurrentNotificationUserId();
    const nextNotifications = await getNotificationsForUser(nextUserId, 8);

    setUserId(nextUserId);
    setNotifications(nextNotifications);
    setIsLoading(false);
  };

  const selectNotification = async (notification: PopScoreNotification) => {
    const href = getNotificationHref(notification);

    setNotifications((currentNotifications) =>
      currentNotifications.map((currentNotification) =>
        currentNotification.id === notification.id
          ? { ...currentNotification, isRead: true }
          : currentNotification
      )
    );
    setIsOpen(false);
    await markNotificationAsRead(notification.id);
    router.push(href);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={
          hasUnread
            ? `Open notifications, ${unreadCount} unread`
            : "Open notifications"
        }
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
          void refreshNotifications();
        }}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border shadow-lg transition ${
          hasUnread
            ? "border-yellow-400/55 bg-yellow-400/10 text-yellow-300 shadow-yellow-400/10 hover:bg-yellow-400/20"
            : "border-slate-700/90 bg-slate-950/85 text-slate-300 shadow-black/20 hover:border-yellow-400/60 hover:text-yellow-300"
        }`}
      >
        <BellIcon hasUnread={hasUnread} />
        {hasUnread ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-black leading-none text-black ring-2 ring-slate-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <NotificationDropdown
          isLoading={isLoading || !userId}
          notifications={notifications}
          onSelect={selectNotification}
        />
      ) : null}
    </div>
  );
}
