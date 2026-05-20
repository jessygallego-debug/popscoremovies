"use client";

import {
  getCurrentProfile,
  getCurrentUser,
  getSupabaseAccessToken,
} from "@/lib/profile-store";
import { createNotification } from "@/lib/notifications";

export const FOLLOWS_UPDATED_EVENT = "popscore-follows-updated";

const LOCAL_FOLLOWS_KEY = "popscore-user-follows";

type FollowRow = {
  created_at: string;
  follower_id: string;
  following_id: string;
  id: string;
};

export type FollowTarget = {
  displayName?: string | null;
  userId: string;
  username?: string | null;
};

export type FollowSummary = {
  currentUserId: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
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
    throw new Error(`Follow request failed with ${response.status}.`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

function canUseLocalStorage() {
  return typeof window !== "undefined";
}

function isFollowRow(value: unknown): value is FollowRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<FollowRow>;

  return Boolean(row.id && row.follower_id && row.following_id);
}

function readLocalFollows() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(LOCAL_FOLLOWS_KEY) ?? "[]"
    );

    return Array.isArray(parsed) ? parsed.filter(isFollowRow) : [];
  } catch {
    return [];
  }
}

function writeLocalFollows(rows: FollowRow[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(LOCAL_FOLLOWS_KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event(FOLLOWS_UPDATED_EVENT));
}

function localFollowId(followerId: string, followingId: string) {
  return `follow_${followerId}_${followingId}`;
}

function targetIsCurrentUser(
  target: FollowTarget,
  currentUserId: string | null,
  currentUsername?: string | null
) {
  const targetUsername = target.username?.trim().toLowerCase();
  const actorUsername = currentUsername?.trim().toLowerCase();

  return Boolean(
    currentUserId &&
      (target.userId === currentUserId ||
        (targetUsername && actorUsername && targetUsername === actorUsername))
  );
}

async function getCurrentFollowContext() {
  const currentUser = await getCurrentUser().catch(() => null);
  const currentProfile = currentUser
    ? await getCurrentProfile().catch(() => null)
    : null;

  return { currentProfile, currentUser };
}

function localSummary(
  target: FollowTarget,
  currentUserId: string | null,
  isOwnProfile: boolean
): FollowSummary {
  const rows = readLocalFollows();

  return {
    currentUserId,
    followersCount: rows.filter((row) => row.following_id === target.userId)
      .length,
    followingCount: rows.filter((row) => row.follower_id === target.userId)
      .length,
    isFollowing: Boolean(
      currentUserId &&
        rows.some(
          (row) =>
            row.follower_id === currentUserId &&
            row.following_id === target.userId
        )
    ),
    isOwnProfile,
  };
}

export async function getFollowSummary(
  target: FollowTarget
): Promise<FollowSummary> {
  const { currentProfile, currentUser } = await getCurrentFollowContext();
  const currentUserId = currentUser?.id ?? null;
  const isOwnProfile = targetIsCurrentUser(
    target,
    currentUserId,
    currentProfile?.username
  );

  try {
    const [followers, following, currentFollow] = await Promise.all([
      supabaseFetch<FollowRow[]>(
        `/user_follows?following_id=eq.${encodeURIComponent(
          target.userId
        )}&select=id,follower_id,following_id,created_at`
      ),
      supabaseFetch<FollowRow[]>(
        `/user_follows?follower_id=eq.${encodeURIComponent(
          target.userId
        )}&select=id,follower_id,following_id,created_at`
      ),
      currentUserId
        ? supabaseFetch<FollowRow[]>(
            `/user_follows?follower_id=eq.${encodeURIComponent(
              currentUserId
            )}&following_id=eq.${encodeURIComponent(
              target.userId
            )}&select=id,follower_id,following_id,created_at`
          )
        : Promise.resolve([]),
    ]);

    return {
      currentUserId,
      followersCount: followers.length,
      followingCount: following.length,
      isFollowing: currentFollow.length > 0,
      isOwnProfile,
    };
  } catch {
    return localSummary(target, currentUserId, isOwnProfile);
  }
}

export async function getFollowingUserIdsForCurrentUser() {
  const currentUser = await getCurrentUser().catch(() => null);

  if (!currentUser) {
    return [];
  }

  try {
    const rows = await supabaseFetch<Pick<FollowRow, "following_id">[]>(
      `/user_follows?follower_id=eq.${encodeURIComponent(
        currentUser.id
      )}&select=following_id`
    );

    return rows.map((row) => row.following_id);
  } catch {
    return readLocalFollows()
      .filter((row) => row.follower_id === currentUser.id)
      .map((row) => row.following_id);
  }
}

export async function toggleFollow(target: FollowTarget) {
  const { currentProfile, currentUser } = await getCurrentFollowContext();

  if (!currentUser) {
    throw new Error("Sign in to your PopFile to follow other users.");
  }

  if (targetIsCurrentUser(target, currentUser.id, currentProfile?.username)) {
    throw new Error("You cannot follow yourself.");
  }

  const summary = await getFollowSummary(target);

  if (summary.isFollowing) {
    try {
      await supabaseFetch<null>(
        `/user_follows?follower_id=eq.${encodeURIComponent(
          currentUser.id
        )}&following_id=eq.${encodeURIComponent(target.userId)}`,
        {
          method: "DELETE",
          headers: {
            Prefer: "return=minimal",
          },
        }
      );
    } catch {
      writeLocalFollows(
        readLocalFollows().filter(
          (row) =>
            !(
              row.follower_id === currentUser.id &&
              row.following_id === target.userId
            )
        )
      );
    }

    if (canUseLocalStorage()) {
      window.dispatchEvent(new Event(FOLLOWS_UPDATED_EVENT));
    }

    return getFollowSummary(target);
  }

  const followRow: FollowRow = {
    created_at: new Date().toISOString(),
    follower_id: currentUser.id,
    following_id: target.userId,
    id: localFollowId(currentUser.id, target.userId),
  };

  try {
    await supabaseFetch<FollowRow[]>(
      "/user_follows?on_conflict=follower_id,following_id",
      {
        method: "POST",
        headers: {
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify({
          follower_id: currentUser.id,
          following_id: target.userId,
        }),
      }
    );
  } catch {
    const rows = readLocalFollows().filter(
      (row) =>
        !(
          row.follower_id === currentUser.id &&
          row.following_id === target.userId
        )
    );

    writeLocalFollows([followRow, ...rows]);
  }

  await createNotification({
    actorUserId: currentUser.id,
    actorUsername: currentProfile?.username ?? currentUser.email ?? null,
    entityId: currentProfile?.username ?? currentUser.id,
    entityType: "user_profile",
    message: `${
      currentProfile?.username ?? currentUser.email?.split("@")[0] ?? "Someone"
    } started following you.`,
    recipientUserId: target.userId,
    recipientUsername: target.username,
    type: "new_follower",
  });

  if (canUseLocalStorage()) {
    window.dispatchEvent(new Event(FOLLOWS_UPDATED_EVENT));
  }

  return getFollowSummary(target);
}
