"use client";

import { avatarForKey } from "@/lib/profile-config";
import {
  createNotification,
  type NotificationActor,
  type NotificationEntityType,
} from "@/lib/notifications";
import {
  getProfilesByUsernames,
  normalizeUsername,
  type ProfileRecord,
} from "@/lib/profile-store";

export type MentionableUser = {
  avatar: string;
  displayName: string;
  userId: string;
  username: string;
};

const MENTION_PATTERN = /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,24})(?=\b)/g;

function mentionableFromProfile(profile: ProfileRecord): MentionableUser {
  return {
    avatar: avatarForKey(profile.avatar_key).icon,
    displayName: profile.username,
    userId: profile.user_id,
    username: profile.username,
  };
}

export function mergeMentionableUsers(...groups: MentionableUser[][]) {
  const usersByUsername = new Map<string, MentionableUser>();

  groups.flat().forEach((user) => {
    const username = normalizeUsername(user.username);

    if (!username || usersByUsername.has(username)) {
      return;
    }

    usersByUsername.set(username, {
      ...user,
      username,
    });
  });

  return Array.from(usersByUsername.values()).sort((firstUser, secondUser) =>
    firstUser.username.localeCompare(secondUser.username)
  );
}

export function mentionedUsernames(value: string) {
  const usernames = new Set<string>();

  Array.from(value.matchAll(MENTION_PATTERN)).forEach((match) => {
    usernames.add(normalizeUsername(match[2]));
  });

  return Array.from(usernames).filter(Boolean);
}

export async function resolveMentionedUsers(
  value: string,
  knownUsers: MentionableUser[] = []
) {
  const usernames = mentionedUsernames(value);

  if (usernames.length === 0) {
    return [];
  }

  const knownUsersByUsername = new Map<string, MentionableUser>(
    knownUsers.map((user) => [normalizeUsername(user.username), user])
  );
  const missingUsernames = usernames.filter(
    (username) => !knownUsersByUsername.has(username)
  );
  const fetchedProfiles = missingUsernames.length
    ? await getProfilesByUsernames(missingUsernames).catch(() => [])
    : [];
  const fetchedUsersByUsername = new Map<string, MentionableUser>(
    fetchedProfiles.map((profile) => [
      normalizeUsername(profile.username),
      mentionableFromProfile(profile),
    ])
  );

  return usernames
    .map(
      (username) =>
        knownUsersByUsername.get(username) ?? fetchedUsersByUsername.get(username)
    )
    .filter((user): user is MentionableUser => Boolean(user));
}

export async function notifyMentionedUsers({
  actor,
  body,
  entityId,
  entityType,
  excludeUserIds = [],
  excludeUsernames = [],
  knownUsers = [],
  message,
}: {
  actor: NotificationActor;
  body: string;
  entityId: string;
  entityType: NotificationEntityType;
  excludeUserIds?: Array<string | null | undefined>;
  excludeUsernames?: Array<string | null | undefined>;
  knownUsers?: MentionableUser[];
  message: string;
}) {
  const excludedUserIds = new Set(excludeUserIds.filter(Boolean));
  const excludedUsernames = new Set(
    excludeUsernames
      .map((username) => (username ? normalizeUsername(username) : ""))
      .filter(Boolean)
  );
  const mentionedUsers = await resolveMentionedUsers(body, knownUsers);

  await Promise.all(
    mentionedUsers
      .filter(
        (user) =>
          !excludedUserIds.has(user.userId) &&
          !excludedUsernames.has(normalizeUsername(user.username))
      )
      .map((user) =>
        createNotification({
          actorUserId: actor.userId,
          actorUsername: actor.username,
          entityId,
          entityType,
          message,
          recipientUserId: user.userId,
          recipientUsername: user.username,
          type: "mention",
        })
      )
  );
}
