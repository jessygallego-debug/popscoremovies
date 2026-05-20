"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import NotificationItem from "@/app/components/notification-item";
import SiteHeader from "@/app/components/site-header";
import {
  getCurrentNotificationUserId,
  getNotificationHref,
  getNotificationsForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NOTIFICATIONS_UPDATED_EVENT,
  type NotificationType,
  type PopScoreNotification,
} from "@/lib/notifications";

type NotificationTab =
  | "All"
  | "Follows"
  | "Replies"
  | "Discussions"
  | "Reactions"
  | "Mentions";

const notificationTabs: NotificationTab[] = [
  "All",
  "Follows",
  "Replies",
  "Discussions",
  "Reactions",
  "Mentions",
];

const tabTypes: Record<Exclude<NotificationTab, "All">, NotificationType[]> = {
  Discussions: ["discussion_comment"],
  Follows: ["follow"],
  Mentions: ["mention"],
  Reactions: ["comment_reaction"],
  Replies: ["comment_reply"],
};

function cardClass(extra = "") {
  return `rounded-3xl border border-slate-800/90 bg-slate-950/78 shadow-2xl shadow-black/30 backdrop-blur ${extra}`;
}

export default function NotificationsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotificationTab>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PopScoreNotification[]>(
    []
  );
  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;
  const visibleNotifications = useMemo(() => {
    if (activeTab === "All") {
      return notifications;
    }

    return notifications.filter((notification) =>
      tabTypes[activeTab].includes(notification.type)
    );
  }, [activeTab, notifications]);

  useEffect(() => {
    let isCurrent = true;

    const loadNotifications = async () => {
      const nextUserId = await getCurrentNotificationUserId();
      const nextNotifications = await getNotificationsForUser(nextUserId, 100);

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

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications);

    return () => {
      isCurrent = false;
      window.removeEventListener(
        NOTIFICATIONS_UPDATED_EVENT,
        refreshNotifications
      );
    };
  }, []);

  const selectNotification = async (notification: PopScoreNotification) => {
    const href = getNotificationHref(notification);

    setNotifications((currentNotifications) =>
      currentNotifications.map((currentNotification) =>
        currentNotification.id === notification.id
          ? { ...currentNotification, isRead: true }
          : currentNotification
      )
    );
    await markNotificationAsRead(notification.id);
    router.push(href);
  };

  const readAllNotifications = async () => {
    if (!userId) {
      return;
    }

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        isRead: true,
      }))
    );
    await markAllNotificationsAsRead(userId);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-black bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,0.14),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_38%,#000_74%,#020617_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:radial-gradient(rgba(250,204,21,0.24)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative mx-auto max-w-[1100px] px-5 py-6 sm:px-8">
        <SiteHeader />

        <section className="py-7 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-black text-white sm:text-5xl">
                Notifications
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                Keep up with follows, replies, reactions, mentions, and movie
                discussions.
              </p>
            </div>
            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={readAllNotifications}
              className="rounded-xl border border-yellow-400/50 px-5 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-black disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500 disabled:hover:bg-transparent"
            >
              Mark all as read
            </button>
          </div>
        </section>

        <section className={cardClass("p-3 sm:p-4")}>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {notificationTabs.map((tab) => {
              const isSelected = tab === activeTab;

              return (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-black transition ${
                    isSelected
                      ? "border-yellow-400 bg-yellow-400 text-black"
                      : "border-slate-700 bg-slate-950/90 text-slate-100 hover:border-yellow-400/60 hover:text-yellow-300"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 space-y-3">
          {isLoading ? (
            <div className={cardClass("p-6 text-sm font-bold text-slate-400")}>
              Loading notifications...
            </div>
          ) : visibleNotifications.length > 0 ? (
            visibleNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={selectNotification}
              />
            ))
          ) : (
            <div className={cardClass("p-8 text-center")}>
              <h2 className="text-xl font-black text-white">
                You&apos;re all caught up.
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-400">
                New activity from the PopScore community will show up here.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
