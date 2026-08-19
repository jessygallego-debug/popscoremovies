import { discussionHref } from "@/lib/urls";

export const discussionTypes = [
  "Question",
  "Debate",
  "Theory",
  "Ending Explained",
  "Hot Take",
  "Recommendation",
] as const;

export const discussionFilterOptions = [
  "Trending",
  "Newest",
  "Most Commented",
  "Spoiler-Free",
] as const;

export const communityDiscussionsStorageKey =
  "popscore-community-discussions";

export type DiscussionType = (typeof discussionTypes)[number];

export type DiscussionFilter = (typeof discussionFilterOptions)[number];

export type CommunityDiscussion = {
  body: string;
  commentCount: number;
  createdAt: string;
  id: string;
  isSpoiler: boolean;
  lastActiveAt: string;
  likeCount: number;
  movieGenres: string[];
  movieId: string;
  moviePosterUrl: string | null;
  movieTitle: string;
  movieYear: string;
  startedByAvatarUrl: string;
  startedByDisplayName: string;
  startedByUserId: string;
  startedByUsername?: string;
  tags: string[];
  title: string;
  type: DiscussionType;
};

export type CommunityDiscussionReply = {
  body: string;
  createdAt: string;
  id: string;
  likeCount: number;
  parentReplyId?: string;
  userAvatarUrl: string;
  userDisplayName: string;
  username?: string;
};

const placeholderDiscussionIds = new Set([
  "interstellar-nolan-best",
  "sinners-ending-explained",
  "prestige-best-plot-twists",
  "dune-part-two-better",
  "dark-knight-best-villain",
]);

export function isPlaceholderCommunityDiscussionId(discussionId: string) {
  return placeholderDiscussionIds.has(discussionId);
}

function isDiscussionType(value: unknown): value is DiscussionType {
  return (
    typeof value === "string" &&
    discussionTypes.includes(value as DiscussionType)
  );
}

function isCommunityDiscussion(value: unknown): value is CommunityDiscussion {
  if (!value || typeof value !== "object") {
    return false;
  }

  const discussion = value as Partial<CommunityDiscussion>;

  return Boolean(
    discussion.id &&
      discussion.movieId &&
      discussion.movieTitle &&
      discussion.title &&
      !isPlaceholderCommunityDiscussionId(discussion.id) &&
      isDiscussionType(discussion.type)
  );
}

export function parseStoredCommunityDiscussions(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter(isCommunityDiscussion)
      : [];
  } catch {
    return [];
  }
}

export function communityDiscussionHref(discussionId: string, title?: string) {
  const discussion = title !== undefined ? { id: discussionId, title } : null;

  return discussion
    ? discussionHref(discussion)
    : `/community/discussions/${discussionId}`;
}
