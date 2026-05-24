"use client";

import {
  getCurrentProfile,
  getCurrentUser,
  getSupabaseAccessToken,
} from "@/lib/profile-store";

export const NOTIFICATIONS_UPDATED_EVENT = "popscore-notifications-updated";

const LOCAL_NOTIFICATIONS_KEY = "popscore-notifications";
const LOCAL_ACTOR_ID = "current-user";

export type NotificationType =
  | "follow"
  | "new_follower"
  | "comment_reply"
  | "discussion_comment"
  | "comment_reaction"
  | "mention";

export type NotificationEntityType =
  | "user_profile"
  | "movie"
  | "movie_comment"
  | "discussion"
  | "discussion_comment"
  | "review";

export type PopScoreNotification = {
  actorUserId: string;
  createdAt: string;
  entityId: string;
  entityType: NotificationEntityType;
  id: string;
  isRead: boolean;
  message: string;
  recipientUserId: string;
  type: NotificationType;
};

type NotificationRow = {
  actor_user_id: string;
  created_at: string;
  entity_id: string;
  entity_type: NotificationEntityType;
  id: string;
  is_read: boolean;
  message: string;
  recipient_user_id: string;
  type: NotificationType;
};

type CreateNotificationInput = {
  actorUserId: string;
  actorUsername?: string | null;
  entityId: string;
  entityType: NotificationEntityType;
  message: string;
  recipientUserId: string;
  recipientUsername?: string | null;
  type: NotificationType;
};

export type NotificationActor = {
  displayName: string;
  userId: string;
  username?: string | null;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  return {
    key,
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`,
  };
}

async function authHeaders() {
  const config = getSupabaseConfig();
  const accessToken = await getSupabaseAccessToken();
  const token = accessToken ?? config?.key;

  if (!config || !token) {
    throw new Error("Supabase is not configured.");
  }

  return {
    apikey: config.key,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function supabaseFetch<T>(path: string, options: RequestInit = {}) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.restUrl}${path}`, {
    ...options,
    headers: {
      ...(await authHeaders()),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(
      responseText
        ? `Notification request failed with ${response.status}: ${responseText}`
        : `Notification request failed with ${response.status}.`
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  const responseText = await response.text();

  if (!responseText) {
    return null as T;
  }

  return JSON.parse(responseText) as T;
}

function mapNotificationRow(row: NotificationRow): PopScoreNotification {
  return {
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
    entityId: row.entity_id,
    entityType: row.entity_type,
    id: row.id,
    isRead: row.is_read,
    message: row.message,
    recipientUserId: row.recipient_user_id,
    type: row.type,
  };
}

function canUseLocalStorage() {
  return typeof window !== "undefined";
}

function readLocalNotifications() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(LOCAL_NOTIFICATIONS_KEY) ?? "[]"
    );

    return Array.isArray(parsed)
      ? parsed.filter(isPopScoreNotification)
      : [];
  } catch {
    return [];
  }
}

function writeLocalNotifications(notifications: PopScoreNotification[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    LOCAL_NOTIFICATIONS_KEY,
    JSON.stringify(notifications)
  );
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}

function isPopScoreNotification(
  value: unknown
): value is PopScoreNotification {
  if (!value || typeof value !== "object") {
    return false;
  }

  const notification = value as Partial<PopScoreNotification>;

  return Boolean(
    notification.id &&
      notification.recipientUserId &&
      notification.actorUserId &&
      notification.type &&
      notification.entityType &&
      notification.entityId &&
      typeof notification.message === "string"
  );
}

function localNotificationId() {
  return `notification_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2, 8)}`;
}

function normalizeUsername(username?: string | null) {
  return username?.trim().toLowerCase() ?? "";
}

function shouldSkipNotification(input: CreateNotificationInput) {
  return (
    input.recipientUserId === input.actorUserId ||
    (normalizeUsername(input.recipientUsername) &&
      normalizeUsername(input.recipientUsername) ===
        normalizeUsername(input.actorUsername))
  );
}

function createLocalNotification(input: CreateNotificationInput) {
  if (shouldSkipNotification(input)) {
    return null;
  }

  const notification: PopScoreNotification = {
    actorUserId: input.actorUserId,
    createdAt: new Date().toISOString(),
    entityId: input.entityId,
    entityType: input.entityType,
    id: localNotificationId(),
    isRead: false,
    message: input.message,
    recipientUserId: input.recipientUserId,
    type: input.type,
  };
  const notifications = [notification, ...readLocalNotifications()];

  writeLocalNotifications(notifications);
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));

  return notification;
}

export async function getCurrentNotificationActor(): Promise<NotificationActor> {
  const profile = await getCurrentProfile().catch(() => null);

  if (profile) {
    return {
      displayName: profile.username,
      userId: profile.user_id,
      username: profile.username,
    };
  }

  const user = await getCurrentUser().catch(() => null);

  if (user) {
    return {
      displayName: user.email?.split("@")[0] ?? "Someone",
      userId: user.id,
      username: user.email?.split("@")[0] ?? null,
    };
  }

  return {
    displayName: "Jessy",
    userId: LOCAL_ACTOR_ID,
    username: "jessyg305",
  };
}

export async function getCurrentNotificationUserId() {
  const actor = await getCurrentNotificationActor();

  return actor.userId;
}

export async function createNotification(input: CreateNotificationInput) {
  if (shouldSkipNotification(input)) {
    return null;
  }

  try {
    await supabaseFetch<null>("/notifications", {
      method: "POST",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        actor_user_id: input.actorUserId,
        entity_id: input.entityId,
        entity_type: input.entityType,
        is_read: false,
        message: input.message,
        recipient_user_id: input.recipientUserId,
        type: input.type,
      }),
    });

    if (canUseLocalStorage()) {
      window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
    }

    return null;
  } catch (error) {
    console.warn("Could not save notification in Supabase.", error);
    return createLocalNotification(input);
  }
}

export async function getNotificationsForUser(userId: string, limit = 30) {
  try {
    const rows = await supabaseFetch<NotificationRow[]>(
      `/notifications?recipient_user_id=eq.${encodeURIComponent(
        userId
      )}&select=id,recipient_user_id,actor_user_id,type,entity_type,entity_id,message,is_read,created_at&order=created_at.desc&limit=${limit}`
    );

    return rows.map(mapNotificationRow);
  } catch {
    return readLocalNotifications()
      .filter((notification) => notification.recipientUserId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
  }
}

export async function getUnreadNotificationCount(userId: string) {
  const notifications = await getNotificationsForUser(userId, 100);

  return notifications.filter((notification) => !notification.isRead).length;
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const rows = await supabaseFetch<NotificationRow[]>(
      `/notifications?id=eq.${encodeURIComponent(notificationId)}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          is_read: true,
        }),
      }
    );
    const notification = rows[0] ? mapNotificationRow(rows[0]) : null;

    if (canUseLocalStorage()) {
      window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
    }

    return notification;
  } catch {
    const notifications = readLocalNotifications().map((notification) =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    );

    writeLocalNotifications(notifications);

    return notifications.find(
      (notification) => notification.id === notificationId
    ) ?? null;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    await supabaseFetch<NotificationRow[]>(
      `/notifications?recipient_user_id=eq.${encodeURIComponent(
        userId
      )}&is_read=eq.false`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          is_read: true,
        }),
      }
    );

    if (canUseLocalStorage()) {
      window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
    }
  } catch {
    const notifications = readLocalNotifications().map((notification) =>
      notification.recipientUserId === userId
        ? { ...notification, isRead: true }
        : notification
    );

    writeLocalNotifications(notifications);
  }
}

export function getNotificationHref(notification: PopScoreNotification) {
  if (notification.entityId.startsWith("/")) {
    return notification.entityId;
  }

  if (notification.type === "follow" || notification.type === "new_follower") {
    return `/profile/${notification.entityId}`;
  }

  if (
    notification.type === "discussion_comment" ||
    notification.type === "mention" ||
    notification.entityType === "discussion" ||
    notification.entityType === "discussion_comment"
  ) {
    const discussionHash =
      notification.type === "discussion_comment" ||
      notification.type === "mention" ||
      notification.entityType === "discussion_comment"
        ? "#comments"
        : "";

    return `/community/discussions/${notification.entityId}${discussionHash}`;
  }

  if (
    notification.type === "comment_reply" ||
    notification.type === "comment_reaction" ||
    notification.entityType === "movie_comment" ||
    notification.entityType === "review"
  ) {
    return "/community";
  }

  if (
    notification.entityType === "movie"
  ) {
    return `/movie/${notification.entityId}`;
  }

  return "/community";
}
