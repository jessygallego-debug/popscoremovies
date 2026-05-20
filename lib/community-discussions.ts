export const discussionTypes = [
  "Question",
  "Debate",
  "Theory",
  "Ending Explained",
  "Hot Take",
  "Recommendation",
] as const;

export const discussionFilterOptions = [
  "All",
  "Trending",
  "Newest",
  "Most Commented",
  "Spoiler-Free",
  "My Genres",
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
  reactionEmoji?: string;
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

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60000).toISOString();
}

export const mockCommunityDiscussions: CommunityDiscussion[] = [
  {
    body:
      "Nolan made a lot of great movies, but Interstellar still feels like the one people keep coming back to. Curious where everyone ranks it.",
    commentCount: 68,
    createdAt: daysAgo(3),
    id: "interstellar-nolan-best",
    isSpoiler: false,
    lastActiveAt: minutesAgo(120),
    likeCount: 14,
    movieGenres: ["Sci-Fi", "Adventure", "Drama"],
    movieId: "157336",
    moviePosterUrl: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    movieTitle: "Interstellar",
    movieYear: "2014",
    reactionEmoji: "🚀",
    startedByAvatarUrl: "🔥",
    startedByDisplayName: "Jessy",
    startedByUserId: "user-jessy",
    startedByUsername: "jessyg305",
    tags: ["Sci-Fi", "Nolan"],
    title: "Was Interstellar Nolan's best movie?",
    type: "Debate",
  },
  {
    body:
      "That ending has a lot going on. The music, the final reveal, and what it says about the characters all deserve a real breakdown.",
    commentCount: 42,
    createdAt: daysAgo(2),
    id: "sinners-ending-explained",
    isSpoiler: true,
    lastActiveAt: minutesAgo(240),
    likeCount: 19,
    movieGenres: ["Horror", "Thriller", "Drama"],
    movieId: "1233413",
    moviePosterUrl: null,
    movieTitle: "Sinners",
    movieYear: "2025",
    reactionEmoji: "🩸",
    startedByAvatarUrl: "🎬",
    startedByDisplayName: "MovieMike",
    startedByUserId: "user-moviemike",
    startedByUsername: "moviemike",
    tags: ["Horror", "Thriller"],
    title: "The ending of Sinners explained",
    type: "Ending Explained",
  },
  {
    body:
      "The Prestige still gets brought up every time twist endings come up. Is it the gold standard or does another movie beat it?",
    commentCount: 91,
    createdAt: daysAgo(5),
    id: "prestige-best-plot-twists",
    isSpoiler: true,
    lastActiveAt: minutesAgo(60),
    likeCount: 31,
    movieGenres: ["Mystery", "Thriller", "Drama"],
    movieId: "1124",
    moviePosterUrl: "/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg",
    movieTitle: "The Prestige",
    movieYear: "2006",
    reactionEmoji: "🎩",
    startedByAvatarUrl: "🎥",
    startedByDisplayName: "FilmFanatic",
    startedByUserId: "user-filmfanatic",
    startedByUsername: "filmfanatic",
    tags: ["Mystery", "Thriller"],
    title: "Best plot twists of all time?",
    type: "Debate",
  },
  {
    body:
      "Part Two was huge, but I still see people split on whether it actually passed the first one. Where do you land?",
    commentCount: 37,
    createdAt: daysAgo(1),
    id: "dune-part-two-better",
    isSpoiler: false,
    lastActiveAt: minutesAgo(360),
    likeCount: 22,
    movieGenres: ["Sci-Fi", "Adventure", "Action"],
    movieId: "693134",
    moviePosterUrl: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    movieTitle: "Dune: Part Two",
    movieYear: "2024",
    reactionEmoji: "🏜️",
    startedByAvatarUrl: "👻",
    startedByDisplayName: "Lina Rose",
    startedByUserId: "user-linarose",
    startedByUsername: "linarose",
    tags: ["Sci-Fi", "Adventure"],
    title: "Was Dune: Part Two better than Part One?",
    type: "Hot Take",
  },
  {
    body:
      "Ledger's Joker changed the way people talked about comic book villains. Is anyone above him?",
    commentCount: 105,
    createdAt: daysAgo(4),
    id: "dark-knight-best-villain",
    isSpoiler: false,
    lastActiveAt: minutesAgo(30),
    likeCount: 44,
    movieGenres: ["Action", "Crime", "Drama"],
    movieId: "155",
    moviePosterUrl: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    movieTitle: "The Dark Knight",
    movieYear: "2008",
    reactionEmoji: "🃏",
    startedByAvatarUrl: "🚀",
    startedByDisplayName: "CinephileChris",
    startedByUserId: "user-cinephilechris",
    startedByUsername: "cinephilechris",
    tags: ["Action", "Crime"],
    title: "Is Heath Ledger's Joker the best villain ever?",
    type: "Debate",
  },
];

export const mockDiscussionReplies: Record<string, CommunityDiscussionReply[]> =
  {
    "interstellar-nolan-best": [
      {
        body:
          "It is my favorite Nolan movie because the emotional story is just as big as the sci-fi idea.",
        createdAt: minutesAgo(80),
        id: "reply-interstellar-1",
        likeCount: 12,
        userAvatarUrl: "⭐",
        userDisplayName: "Dreddock",
        username: "dreddock",
      },
      {
        body:
          "The Dark Knight is tighter for me, but Interstellar has the highest ceiling.",
        createdAt: minutesAgo(35),
        id: "reply-interstellar-2",
        likeCount: 7,
        userAvatarUrl: "🎟️",
        userDisplayName: "ScreenQueen",
        username: "screenqueen",
      },
    ],
    "sinners-ending-explained": [
      {
        body:
          "The ending works because it pays off the music as more than style. It becomes the whole point.",
        createdAt: minutesAgo(160),
        id: "reply-sinners-1",
        likeCount: 9,
        userAvatarUrl: "🎭",
        userDisplayName: "Reels2Rants",
        username: "reels2rantsdawk88",
      },
    ],
    "prestige-best-plot-twists": [
      {
        body:
          "The reveal is great, but the rewatch is what makes it special. Every scene changes meaning.",
        createdAt: minutesAgo(45),
        id: "reply-prestige-1",
        likeCount: 18,
        userAvatarUrl: "🍿",
        userDisplayName: "PopcornPat",
        username: "popcornpat",
      },
    ],
    "dune-part-two-better": [
      {
        body:
          "Part Two has the bigger moments, but Part One does the worldbuilding work that makes those moments hit.",
        createdAt: minutesAgo(220),
        id: "reply-dune-1",
        likeCount: 11,
        userAvatarUrl: "🔥",
        userDisplayName: "Jessy",
        username: "jessyg305",
      },
    ],
    "dark-knight-best-villain": [
      {
        body:
          "For comic book movies, yes. Across all movies, I still think Anton Chigurh belongs in the conversation.",
        createdAt: minutesAgo(20),
        id: "reply-dark-knight-1",
        likeCount: 15,
        userAvatarUrl: "🎬",
        userDisplayName: "MovieMike",
        username: "moviemike",
      },
    ],
  };

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

export function communityDiscussionHref(discussionId: string) {
  return `/community/discussions/${discussionId}`;
}

export function getMockCommunityDiscussion(discussionId: string) {
  return mockCommunityDiscussions.find(
    (discussion) => discussion.id === discussionId
  );
}

export function getMockDiscussionReplies(discussionId: string) {
  return mockDiscussionReplies[discussionId] ?? [];
}
