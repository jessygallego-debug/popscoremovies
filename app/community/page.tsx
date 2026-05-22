"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import CommunityPostComments from "@/app/components/community-post-comments";
import FollowButton from "@/app/components/follow-button";
import CommunityPostLikeButton from "@/app/components/community-post-like-button";
import MoviePosterImage from "@/app/components/movie-poster-image";
import SiteHeader from "@/app/components/site-header";
import {
  communityDiscussionHref,
  communityDiscussionsStorageKey,
  discussionFilterOptions,
  discussionTypes,
  mockCommunityDiscussions,
  mockDiscussionReplies,
  parseStoredCommunityDiscussions,
  type CommunityDiscussion,
  type DiscussionFilter,
  type DiscussionType,
} from "@/lib/community-discussions";
import {
  FOLLOWS_UPDATED_EVENT,
  getFollowingUserIdsForCurrentUser,
} from "@/lib/follows";
import {
  getDiscoverableUsers,
  getCurrentUser,
  getRecentRatingsForUsers,
  getRecentCommunityRatings,
  getTopReviewers,
  type CommunityRatingFeedItem,
  type DiscoverableUserSummary,
  type TopReviewerSummary,
} from "@/lib/profile-store";
import { posterUrl } from "@/lib/tmdb";

type CommunityUser = {
  avatar: string;
  displayName: string;
  userId?: string;
  username: string;
};

type PopScoreReaction = {
  accentClass: string;
  iconSrc: string;
  label: string;
};

type CommunityFeedPost = {
  actionHref?: string;
  actionLabel?: string;
  activity: string;
  comment?: string;
  commentCount: number;
  genres: string[];
  id: string;
  interactedAvatars: string[];
  extraInteractions: number;
  likeCount: number;
  movie: {
    fallbackMovieId: string;
    imagePath: string | null;
    title: string;
  };
  popscore?: number;
  reaction?: PopScoreReaction;
  replyLink?: string;
  timestamp: string;
  user: CommunityUser;
};

type SuggestedFollow = DiscoverableUserSummary;

type FollowingReaction = "loved_it" | "worth_watching" | "trash";

type FollowingActivity =
  | {
      avatar: string;
      comment?: string;
      createdAt: string;
      genre: string;
      id: string;
      movieId: string;
      moviePoster: string | null;
      movieTitle: string;
      popScore: number;
      reaction?: FollowingReaction;
      type: "rating";
      userId: string;
      username: string;
    }
  | {
      avatar: string;
      createdAt: string;
      id: string;
      movieId: string;
      moviePoster: string | null;
      movieTitle: string;
      reaction: FollowingReaction;
      type: "reaction";
      userId: string;
      username: string;
    }
  | {
      avatar: string;
      createdAt: string;
      discussionId: string;
      discussionTitle: string;
      id: string;
      movieId?: string;
      movieTitle?: string;
      replyCount: number;
      type: "discussion_created";
      userId: string;
      username: string;
    }
  | {
      avatar: string;
      commentPreview: string;
      createdAt: string;
      discussionId: string;
      discussionTitle: string;
      id: string;
      movieId?: string;
      movieTitle?: string;
      type: "discussion_comment";
      userId: string;
      username: string;
    };

type MovieSuggestion = {
  genreNames?: string[];
  id: number;
  posterPath?: string | null;
  releaseDate: string;
  title: string;
};

const feedTabs = ["Feed", "Following", "Discussions", "People"] as const;

type CommunityTab = (typeof feedTabs)[number];

const genreFilters = [
  "All Genres",
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Rom-Com",
  "Sci-Fi",
  "Thriller",
  "War",
];

const trendFilters = ["Trending", "Newest", "Most Liked", "Most Commented"];

const feedPosts: CommunityFeedPost[] = [
  {
    id: "interstellar-rating",
    user: {
      avatar: "🔥",
      displayName: "Jessy",
      userId: "user-jessy",
      username: "jessy",
    },
    activity: "rated Interstellar",
    timestamp: "2h ago",
    movie: {
      title: "Interstellar",
      fallbackMovieId: "157336",
      imagePath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    },
    popscore: 94,
    reaction: reactionForScore(94),
    comment:
      "A masterpiece. The visuals, the story, the emotions... everything about this movie hits differently.",
    genres: ["Adventure", "Drama", "Sci-Fi"],
    likeCount: 24,
    commentCount: 7,
    interactedAvatars: ["🎬", "🌹", "⭐", "🚀"],
    extraInteractions: 18,
  },
  {
    id: "sinners-worth-watching",
    user: {
      avatar: "🎬",
      displayName: "Mike",
      userId: "user-moviemike",
      username: "moviemike",
    },
    activity: "marked Sinners as Worth Watching",
    timestamp: "5h ago",
    movie: {
      title: "Sinners",
      fallbackMovieId: "1233413",
      imagePath: null,
    },
    popscore: 78,
    reaction: reactionForScore(78),
    comment:
      "Great music, strong performances and a fresh take on the genre. Third act was wild!",
    genres: ["Drama", "Horror", "Thriller"],
    likeCount: 16,
    commentCount: 3,
    interactedAvatars: ["🔥", "🎥", "👻", "🎟️"],
    extraInteractions: 12,
  },
  {
    id: "dark-knight-comment",
    user: {
      avatar: "🌹",
      displayName: "Sarah",
      userId: "user-sarahscreens",
      username: "sarahscreens",
    },
    activity: "commented on The Dark Knight",
    timestamp: "1d ago",
    movie: {
      title: "The Dark Knight",
      fallbackMovieId: "155",
      imagePath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    },
    comment:
      "Heath Ledger delivered something the world has never seen before. Still gives me chills.",
    genres: ["Action", "Crime", "Drama", "Thriller"],
    likeCount: 21,
    commentCount: 4,
    replyLink: "View 4 replies",
    interactedAvatars: [],
    extraInteractions: 0,
  },
  {
    id: "prestige-discovery",
    user: {
      avatar: "🚀",
      displayName: "Chris",
      userId: "user-cinephilechris",
      username: "cinephilechris",
    },
    activity: "discovered The Prestige",
    timestamp: "1d ago",
    movie: {
      title: "The Prestige",
      fallbackMovieId: "1124",
      imagePath: "/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg",
    },
    comment: "Discovered this gem through PopScore Discovery ✨",
    genres: ["Drama", "Mystery", "Thriller"],
    likeCount: 18,
    commentCount: 2,
    interactedAvatars: ["🔥", "🎬", "🎥", "👻"],
    extraInteractions: 7,
  },
  {
    id: "dune-rating",
    user: {
      avatar: "👻",
      displayName: "Lina",
      userId: "user-linarose",
      username: "linarose",
    },
    activity: "rated Dune: Part Two",
    timestamp: "2d ago",
    movie: {
      title: "Dune: Part Two",
      fallbackMovieId: "693134",
      imagePath: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    },
    popscore: 90,
    reaction: reactionForScore(90),
    comment: "Absolutely stunning. Villeneuve is in a league of his own.",
    genres: ["Action", "Adventure", "Drama", "Sci-Fi"],
    likeCount: 31,
    commentCount: 5,
    interactedAvatars: ["🚀", "🎬", "🔥", "🎥"],
    extraInteractions: 22,
  },
];

const suggestedFollows: SuggestedFollow[] = [
  {
    avatar: "👻",
    displayName: "Lina Rose",
    favoriteGenre: "Horror",
    followersCount: 1200,
    totalReviews: 184,
    userId: "user-linarose",
    username: "linarose",
  },
  {
    avatar: "🎬",
    displayName: "MovieMike",
    favoriteGenre: "Action",
    followersCount: 980,
    totalReviews: 248,
    userId: "user-moviemike",
    username: "moviemike",
  },
  {
    avatar: "🎥",
    displayName: "FilmFanatic",
    favoriteGenre: "Drama",
    followersCount: 860,
    totalReviews: 213,
    userId: "user-filmfanatic",
    username: "filmfanatic",
  },
  {
    avatar: "🚀",
    displayName: "CinephileChris",
    favoriteGenre: "Sci-Fi",
    followersCount: 730,
    totalReviews: 167,
    userId: "user-cinephilechris",
    username: "cinephilechris",
  },
  {
    avatar: "⭐",
    displayName: "Dreddock",
    favoriteGenre: "Thriller",
    followersCount: 520,
    totalReviews: 141,
    userId: "user-dreddock",
    username: "dreddock",
  },
  {
    avatar: "🎭",
    displayName: "Reels2Rants",
    favoriteGenre: "Horror",
    followersCount: 430,
    totalReviews: 119,
    userId: "user-reels2rantsdawk88",
    username: "reels2rantsdawk88",
  },
  {
    avatar: "🍿",
    displayName: "PopcornPat",
    favoriteGenre: "Comedy",
    followersCount: 390,
    totalReviews: 104,
    userId: "user-popcornpat",
    username: "popcornpat",
  },
  {
    avatar: "🎟️",
    displayName: "ScreenQueen",
    favoriteGenre: "Romance",
    followersCount: 340,
    totalReviews: 96,
    userId: "user-screenqueen",
    username: "screenqueen",
  },
];

function cardClass(extra = "") {
  return `rounded-3xl border border-slate-800/90 bg-slate-950/78 shadow-2xl shadow-black/30 backdrop-blur ${extra}`;
}

function scoreBadgeClass(score: number) {
  if (score >= 90) {
    return "border-emerald-400/40 bg-emerald-500/20 text-emerald-200 shadow-emerald-400/10";
  }

  if (score >= 75) {
    return "border-yellow-400/40 bg-yellow-400/20 text-yellow-200 shadow-yellow-400/10";
  }

  return "border-orange-400/40 bg-orange-500/20 text-orange-200 shadow-orange-400/10";
}

function getFeedTimestampAgeMinutes(value: string) {
  if (value === "Just now") {
    return 0;
  }

  const match = value.match(/^(\d+)([mhd]) ago$/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  return unit === "m"
    ? amount
    : unit === "h"
      ? amount * 60
      : amount * 24 * 60;
}

function compareFeedPostsByNewest(
  firstPost: CommunityFeedPost,
  secondPost: CommunityFeedPost
) {
  return (
    getFeedTimestampAgeMinutes(firstPost.timestamp) -
    getFeedTimestampAgeMinutes(secondPost.timestamp)
  );
}

function getFeedTrendingScore(post: CommunityFeedPost) {
  const ageMinutes = getFeedTimestampAgeMinutes(post.timestamp);
  const engagementScore =
    post.likeCount * 2 + post.commentCount * 3 + post.extraInteractions;
  const recencyScore =
    ageMinutes === Number.MAX_SAFE_INTEGER
      ? 0
      : Math.max(0, 24 * 60 - ageMinutes) / 120;
  const popScoreBoost = post.popscore
    ? Math.max(0, post.popscore - 50) / 25
    : 0;

  return engagementScore + recencyScore + popScoreBoost;
}

function getVisibleFeedPosts(
  posts: CommunityFeedPost[],
  selectedGenre: string,
  selectedTrend: string
) {
  const matchingPosts =
    selectedGenre === "All Genres"
      ? posts
      : posts.filter((post) => post.genres.includes(selectedGenre));
  const sortedPosts = [...matchingPosts];

  if (selectedTrend === "Most Liked") {
    return sortedPosts.sort(
      (a, b) => b.likeCount - a.likeCount || compareFeedPostsByNewest(a, b)
    );
  }

  if (selectedTrend === "Most Commented") {
    return sortedPosts.sort(
      (a, b) =>
        b.commentCount - a.commentCount || compareFeedPostsByNewest(a, b)
    );
  }

  if (selectedTrend === "Newest") {
    return sortedPosts.sort(compareFeedPostsByNewest);
  }

  return sortedPosts.sort(
    (a, b) =>
      getFeedTrendingScore(b) - getFeedTrendingScore(a) ||
      compareFeedPostsByNewest(a, b)
  );
}

function getVisibleDiscussions(
  discussions: CommunityDiscussion[],
  selectedFilter: DiscussionFilter,
  selectedGenre: string
) {
  const matchingDiscussions = discussions.filter((discussion) => {
    const matchesGenre =
      selectedGenre === "All Genres" ||
      discussion.movieGenres.includes(selectedGenre) ||
      discussion.tags.includes(selectedGenre);
    const matchesFilter =
      selectedFilter === "Spoiler-Free"
        ? !discussion.isSpoiler
        : true;

    return matchesGenre && matchesFilter;
  });
  const sortedDiscussions = [...matchingDiscussions];

  if (selectedFilter === "Newest") {
    return sortedDiscussions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  if (selectedFilter === "Most Commented") {
    return sortedDiscussions.sort((a, b) => b.commentCount - a.commentCount);
  }

  return sortedDiscussions.sort((a, b) => {
    const bActivity =
      new Date(b.lastActiveAt).getTime() / 600000 +
      b.commentCount * 4 +
      b.likeCount;
    const aActivity =
      new Date(a.lastActiveAt).getTime() / 600000 +
      a.commentCount * 4 +
      a.likeCount;

    return bActivity - aActivity;
  });
}

function releaseYear(value: string) {
  return value ? value.slice(0, 4) : "";
}

function communityMovieHref(movieId: string) {
  return `/movie/${movieId}?returnTo=${encodeURIComponent("/community")}`;
}

function communityRateHref(movieId: string) {
  return `/rate?movie=${movieId}&returnTo=${encodeURIComponent(
    "/community"
  )}&from=community`;
}

function formatRelativePostTime(value: string) {
  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return "Just now";
  }

  const minutesAgo = Math.max(0, Math.floor((Date.now() - time) / 60000));

  if (minutesAgo < 1) {
    return "Just now";
  }

  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  const hoursAgo = Math.floor(minutesAgo / 60);

  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }

  return `${Math.floor(hoursAgo / 24)}d ago`;
}

function reactionForScore(score: number): PopScoreReaction {
  if (score >= 90) {
    return {
      accentClass: "text-yellow-200",
      iconSrc: "/rating-icons/extra-buttery-v2.png",
      label: "Extra Buttery",
    };
  }

  if (score >= 75) {
    return {
      accentClass: "text-yellow-300",
      iconSrc: "/rating-icons/buttery.png",
      label: "Buttery",
    };
  }

  if (score >= 60) {
    return {
      accentClass: "text-yellow-100",
      iconSrc: "/rating-icons/fresh-popcorn.png",
      label: "Fresh Popcorn",
    };
  }

  if (score >= 40) {
    return {
      accentClass: "text-orange-200",
      iconSrc: "/rating-icons/salty.png",
      label: "Salty",
    };
  }

  return {
    accentClass: "text-red-200",
    iconSrc: "/rating-icons/burnt.png",
    label: "Burnt",
  };
}

function normalizeCommunityGenres(genreNames: string[], ratingGenre: string) {
  const aliases: Record<string, string> = {
    animated: "Animation",
    animation: "Animation",
    rom_com: "Rom-Com",
    romcom: "Rom-Com",
    sci_fi: "Sci-Fi",
    scifi: "Sci-Fi",
    "science fiction": "Sci-Fi",
  };
  const genres = [...genreNames, ratingGenre]
    .map((genre) => {
      const normalizedGenre = genre.toLowerCase().trim();

      return aliases[normalizedGenre] ?? genre;
    })
    .filter((genre) => genreFilters.includes(genre));

  return Array.from(new Set(genres));
}

function mapCommunityRatingToPost(
  rating: CommunityRatingFeedItem
): CommunityFeedPost {
  return {
    activity: `rated ${rating.movieTitle}`,
    comment: rating.reviewComment ?? undefined,
    commentCount: 0,
    extraInteractions: 0,
    genres: normalizeCommunityGenres(rating.genreNames, rating.genre),
    id: `rating-${rating.id}`,
    interactedAvatars: [],
    likeCount: 0,
    movie: {
      fallbackMovieId: rating.movieId,
      imagePath: rating.posterPath ?? null,
      title: rating.movieTitle,
    },
    popscore: rating.popscore,
    reaction: reactionForScore(rating.popscore),
    timestamp: formatRelativePostTime(rating.updated_at ?? rating.created_at),
    user: {
      avatar: rating.avatar,
      displayName: rating.username,
      userId: rating.user_id,
      username: rating.username,
    },
  };
}

function timeFromFeedTimestamp(value: string) {
  const match = value.match(/^(\d+)([mhd]) ago$/);

  if (!match) {
    return new Date().toISOString();
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const minutes =
    unit === "m" ? amount : unit === "h" ? amount * 60 : amount * 24 * 60;

  return new Date(Date.now() - minutes * 60000).toISOString();
}

function quickReactionLabel(reaction: FollowingReaction) {
  const labels: Record<FollowingReaction, string> = {
    loved_it: "Loved It",
    trash: "Trash",
    worth_watching: "Worth Watching",
  };

  return labels[reaction];
}

function quickReactionFromScore(score: number): FollowingReaction {
  if (score >= 85) {
    return "loved_it";
  }

  if (score >= 60) {
    return "worth_watching";
  }

  return "trash";
}

function communityUserForUsername(username?: string) {
  if (!username) {
    return null;
  }

  const normalizedUsername = username.toLowerCase();

  return (
    suggestedFollows.find(
      (user) => user.username.toLowerCase() === normalizedUsername
    ) ??
    feedPosts.find(
      (post) => post.user.username.toLowerCase() === normalizedUsername
    )?.user ??
    null
  );
}

function buildFollowingActivities({
  discussions,
  followingIds,
  ratings,
}: {
  discussions: CommunityDiscussion[];
  followingIds: string[];
  ratings: CommunityRatingFeedItem[];
}) {
  const followingSet = new Set(followingIds);
  const activities: FollowingActivity[] = [];
  const realRatingActivities = ratings
    .filter((rating) => followingSet.has(rating.user_id))
    .map((rating): FollowingActivity => {
      const createdAt = rating.updated_at ?? rating.created_at;
      const genre = normalizeCommunityGenres(
        rating.genreNames,
        rating.genre
      )[0] ?? rating.genre;

      return {
        avatar: rating.avatar,
        comment: rating.reviewComment ?? undefined,
        createdAt,
        genre,
        id: `following-rating-${rating.id}`,
        movieId: rating.movieId,
        moviePoster: rating.posterPath ?? null,
        movieTitle: rating.movieTitle,
        popScore: rating.popscore,
        reaction: rating.quick_reaction ?? undefined,
        type: "rating",
        userId: rating.user_id,
        username: rating.username,
      };
    });
  const mockRatingActivities = feedPosts
    .filter((post) => followingSet.has(post.user.userId ?? ""))
    .filter((post) => Boolean(post.popscore))
    .map((post): FollowingActivity => {
      const createdAt = timeFromFeedTimestamp(post.timestamp);

      return {
        avatar: post.user.avatar,
        comment: post.comment,
        createdAt,
        genre: post.genres[0] ?? "Movie",
        id: `following-mock-rating-${post.id}`,
        movieId: post.movie.fallbackMovieId,
        moviePoster: post.movie.imagePath,
        movieTitle: post.movie.title,
        popScore: post.popscore ?? 0,
        reaction: quickReactionFromScore(post.popscore ?? 0),
        type: "rating",
        userId: post.user.userId ?? post.user.username,
        username: post.user.username,
      };
    });
  const discussionCreatedActivities = discussions
    .filter((discussion) => followingSet.has(discussion.startedByUserId))
    .map(
      (discussion): FollowingActivity => ({
        avatar: discussion.startedByAvatarUrl,
        createdAt: discussion.createdAt,
        discussionId: discussion.id,
        discussionTitle: discussion.title,
        id: `following-discussion-${discussion.id}`,
        movieId: discussion.movieId,
        movieTitle: discussion.movieTitle,
        replyCount: discussion.commentCount,
        type: "discussion_created",
        userId: discussion.startedByUserId,
        username:
          discussion.startedByUsername ??
          discussion.startedByDisplayName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ""),
      })
    );
  const discussionCommentActivities = discussions.flatMap((discussion) =>
    (mockDiscussionReplies[discussion.id] ?? [])
      .flatMap((reply) => {
        const user = communityUserForUsername(reply.username);

        if (!user?.userId || !followingSet.has(user.userId)) {
          return [];
        }

        return [
          {
          avatar: user.avatar,
          commentPreview: reply.body,
          createdAt: reply.createdAt,
          discussionId: discussion.id,
          discussionTitle: discussion.title,
          id: `following-discussion-comment-${reply.id}`,
          movieId: discussion.movieId,
          movieTitle: discussion.movieTitle,
          type: "discussion_comment",
          userId: user.userId,
          username: user.username,
          } satisfies FollowingActivity,
        ];
      })
  );

  activities.push(
    ...realRatingActivities,
    ...mockRatingActivities,
    ...discussionCreatedActivities,
    ...discussionCommentActivities
  );

  return activities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function formatCompactCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  }

  return String(value);
}

function useFollowingIds() {
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    let isCurrent = true;
    const loadFollowingIds = () => {
      getFollowingUserIdsForCurrentUser()
        .then((nextFollowingIds) => {
          if (isCurrent) {
            setFollowingIds(nextFollowingIds);
          }
        })
        .catch(() => {
          if (isCurrent) {
            setFollowingIds([]);
          }
        });
    };

    loadFollowingIds();
    window.addEventListener(FOLLOWS_UPDATED_EVENT, loadFollowingIds);

    return () => {
      isCurrent = false;
      window.removeEventListener(FOLLOWS_UPDATED_EVENT, loadFollowingIds);
    };
  }, []);

  return followingIds;
}

function formatSuggestionDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function Avatar({
  label,
  size = "md",
}: {
  label: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass = {
    lg: "h-12 w-12 text-2xl",
    md: "h-10 w-10 text-xl",
    sm: "h-7 w-7 text-sm",
    xl: "h-16 w-16 text-3xl",
  }[size];

  return (
    <span
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-[radial-gradient(circle_at_35%_25%,rgba(250,204,21,0.22),rgba(15,23,42,0.96)_58%)] font-black text-white shadow-lg shadow-yellow-400/10`}
    >
      {label}
    </span>
  );
}

function MovieThumb({
  alt,
  fallbackMovieId,
  fit = "cover",
  href,
  imagePath,
  wide = false,
}: {
  alt: string;
  fallbackMovieId: string;
  fit?: "contain" | "cover";
  href?: string;
  imagePath: string | null;
  wide?: boolean;
}) {
  const thumb = (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-900 transition ${
        wide
          ? "mx-auto aspect-[2/3] w-full max-w-[112px] sm:mx-0 sm:max-w-none"
          : "aspect-[4/3]"
      } ${
        href
          ? "shadow-lg shadow-black/25 hover:-translate-y-0.5 hover:shadow-yellow-400/10"
          : ""
      }`}
    >
      <MoviePosterImage
        alt={alt}
        className={fit === "contain" ? "object-contain" : "object-cover"}
        fallbackMovieId={fallbackMovieId}
        sizes={wide ? "(min-width: 1024px) 120px, 112px" : "96px"}
        src={posterUrl(imagePath)}
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );

  if (!href) {
    return thumb;
  }

  return (
    <Link href={href} aria-label={`View ${alt}`} className="block">
      {thumb}
    </Link>
  );
}

function CommunityTabs({
  onSelect,
  selectedTab,
}: {
  onSelect: (tab: CommunityTab) => void;
  selectedTab: CommunityTab;
}) {
  return (
    <div className="flex gap-5 overflow-x-auto border-b border-white/10 text-sm font-black text-slate-400 sm:gap-8">
      {feedTabs.map((tab) => {
        const isSelected = tab === selectedTab;

        return (
          <button
            key={tab}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(tab)}
            className={`shrink-0 border-b-2 px-0 pb-3 transition hover:text-yellow-300 ${
              isSelected
                ? "border-yellow-400 text-yellow-300"
                : "border-transparent"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

function SelectMovieDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsSearching(true);

      fetch(
        `/api/search-suggestions?${new URLSearchParams({
          query: trimmedQuery,
        }).toString()}`,
        { signal: controller.signal }
      )
        .then((response) => response.json())
        .then((data: { suggestions?: MovieSuggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  const selectMovie = (movieId: number) => {
    router.push(communityRateHref(String(movieId)));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select a movie to rate"
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/75 px-4 py-24 backdrop-blur-sm sm:py-28"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/70 sm:p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">Select Movie</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Search for a movie, then rate it.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close movie selector"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-sm font-black text-slate-300 transition hover:border-yellow-400/60 hover:text-yellow-300"
          >
            X
          </button>
        </div>

        <label className="mt-4 block">
          <span className="sr-only">Search movies</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;

              setQuery(nextQuery);

              if (nextQuery.trim().length < 2) {
                setSuggestions([]);
                setIsSearching(false);
              }
            }}
            placeholder="Search for a movie..."
            type="search"
            className="min-h-12 w-full rounded-2xl border border-slate-700 bg-black/35 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70"
          />
        </label>

        <div className="mt-3 max-h-80 overflow-y-auto rounded-2xl border border-slate-800 bg-black/30">
          {suggestions.length > 0 ? (
            suggestions.map((movie) => {
              const releaseDate = formatSuggestionDate(movie.releaseDate);

              return (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => selectMovie(movie.id)}
                  className="block w-full border-b border-slate-900 px-4 py-3 text-left text-sm font-bold text-white transition last:border-b-0 hover:bg-yellow-400 hover:text-black"
                >
                  {movie.title}
                  {releaseDate ? (
                    <span className="ml-2 font-semibold text-slate-400">
                      {releaseDate}
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="px-4 py-5 text-sm font-bold text-slate-500">
              {query.trim().length < 2
                ? "Type at least 2 letters to search."
                : isSearching
                  ? "Searching..."
                  : "No movies found."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MovieSearchSelect({
  onSelect,
  selectedMovie,
}: {
  onSelect: (movie: MovieSuggestion) => void;
  selectedMovie: MovieSuggestion | null;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MovieSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsSearching(true);

      fetch(
        `/api/search-suggestions?${new URLSearchParams({
          query: trimmedQuery,
        }).toString()}`,
        { signal: controller.signal }
      )
        .then((response) => response.json())
        .then((data: { suggestions?: MovieSuggestion[] }) => {
          setSuggestions(data.suggestions ?? []);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div>
      <label className="block">
        <span className="sr-only">Search for a movie</span>
        <input
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;

            setQuery(nextQuery);

            if (nextQuery.trim().length < 2) {
              setSuggestions([]);
              setIsSearching(false);
            }
          }}
          placeholder="Search for a movie..."
          type="search"
          className="min-h-12 w-full rounded-2xl border border-slate-700 bg-black/35 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70"
        />
      </label>

      <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-slate-800 bg-black/30">
        {suggestions.length > 0 ? (
          suggestions.map((movie) => {
            const genres = movie.genreNames ?? [];

            return (
              <button
                key={movie.id}
                type="button"
                onClick={() => {
                  onSelect(movie);
                  setQuery(movie.title);
                  setSuggestions([]);
                }}
                className="grid w-full grid-cols-[54px_1fr] items-center gap-3 border-b border-slate-900 px-3 py-3 text-left transition last:border-b-0 hover:bg-yellow-400 hover:text-black"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-slate-900">
                  <MoviePosterImage
                    alt={movie.title}
                    className="object-cover"
                    fallbackMovieId={String(movie.id)}
                    sizes="54px"
                    src={posterUrl(movie.posterPath ?? null)}
                    unoptimized
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{movie.title}</p>
                  <p className="mt-1 text-xs font-bold opacity-75">
                    {[releaseYear(movie.releaseDate), genres[0]]
                      .filter(Boolean)
                      .join(" • ") || "Movie"}
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <p className="px-4 py-5 text-sm font-bold text-slate-500">
            {query.trim().length < 2
              ? "Type at least 2 letters to search."
              : isSearching
                ? "Searching..."
                : "No movies found."}
          </p>
        )}
      </div>

      {selectedMovie ? (
        <div className="mt-4 grid grid-cols-[76px_1fr] gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-3">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-slate-900">
            <MoviePosterImage
              alt={selectedMovie.title}
              className="object-cover"
              fallbackMovieId={String(selectedMovie.id)}
              sizes="76px"
              src={posterUrl(selectedMovie.posterPath ?? null)}
              unoptimized
            />
          </div>
          <div className="min-w-0 self-center">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-yellow-300">
              Selected Movie
            </p>
            <h3 className="mt-1 truncate text-lg font-black text-white">
              {selectedMovie.title}
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-300">
              {[releaseYear(selectedMovie.releaseDate), ...(selectedMovie.genreNames ?? [])]
                .filter(Boolean)
                .join(" • ") || "Movie"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StartDiscussionModal({
  onClose,
  onPost,
}: {
  onClose: () => void;
  onPost: (discussion: CommunityDiscussion) => void;
}) {
  const [selectedMovie, setSelectedMovie] = useState<MovieSuggestion | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [discussionType, setDiscussionType] = useState<DiscussionType | "">("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const canPost = Boolean(selectedMovie && title.trim() && discussionType);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const postDiscussion = () => {
    if (!selectedMovie || !title.trim() || !discussionType) {
      return;
    }

    const now = new Date().toISOString();
    const movieGenres =
      selectedMovie.genreNames && selectedMovie.genreNames.length > 0
        ? selectedMovie.genreNames
        : ["Drama"];
    const idBase = `${selectedMovie.title}-${title}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);

    onPost({
      body: body.trim(),
      commentCount: 0,
      createdAt: now,
      id: `${idBase || "discussion"}-${Date.now()}`,
      isSpoiler,
      lastActiveAt: now,
      likeCount: 0,
      movieGenres,
      movieId: String(selectedMovie.id),
      moviePosterUrl: selectedMovie.posterPath ?? null,
      movieTitle: selectedMovie.title,
      movieYear: releaseYear(selectedMovie.releaseDate),
      startedByAvatarUrl: "🔥",
      startedByDisplayName: "Jessy",
      startedByUserId: "current-user",
      startedByUsername: "jessyg305",
      tags: movieGenres.slice(0, 2),
      title: title.trim(),
      type: discussionType,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Start a Movie Discussion"
      className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-10 backdrop-blur-sm sm:py-16"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/70 sm:p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">
              Start a Movie Discussion
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Pick a movie first, then add the conversation details.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close discussion form"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-sm font-black text-slate-300 transition hover:border-yellow-400/60 hover:text-yellow-300"
          >
            X
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-black/25 p-4">
            <div className="mb-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">
                Step 1
              </p>
              <h3 className="mt-1 text-base font-black text-white">
                Select Movie
              </h3>
            </div>
            <MovieSearchSelect
              onSelect={setSelectedMovie}
              selectedMovie={selectedMovie}
            />
          </section>

          <section
            className={`rounded-2xl border p-4 transition ${
              selectedMovie
                ? "border-slate-800 bg-black/25"
                : "border-slate-800/60 bg-black/10 opacity-60"
            }`}
          >
            <div className="mb-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">
                Step 2
              </p>
              <h3 className="mt-1 text-base font-black text-white">
                Add Discussion Details
              </h3>
            </div>

            <div className="grid gap-3">
              <label className="block">
                <span className="sr-only">Discussion title</span>
                <input
                  disabled={!selectedMovie}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What do you want to ask or discuss?"
                  className="min-h-12 w-full rounded-2xl border border-slate-700 bg-black/35 px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70 disabled:cursor-not-allowed"
                />
              </label>

              <textarea
                disabled={!selectedMovie}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Share your thoughts to get the conversation started..."
                className="min-h-28 w-full resize-none rounded-2xl border border-slate-700 bg-black/35 px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70 disabled:cursor-not-allowed"
              />

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Discussion Type
                  </span>
                  <select
                    disabled={!selectedMovie}
                    value={discussionType}
                    onChange={(event) =>
                      setDiscussionType(event.target.value as DiscussionType)
                    }
                    className="min-h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-white outline-none transition focus:border-yellow-400/70 disabled:cursor-not-allowed"
                  >
                    <option value="">Choose one</option>
                    {discussionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-700 bg-black/35 px-4 text-sm font-black text-white">
                  <input
                    checked={isSpoiler}
                    disabled={!selectedMovie}
                    onChange={(event) => setIsSpoiler(event.target.checked)}
                    type="checkbox"
                    className="h-4 w-4 accent-yellow-400"
                  />
                  This discussion contains spoilers
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-300 transition hover:border-yellow-400/60 hover:text-yellow-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canPost}
            onClick={postDiscussion}
            className="rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
          >
            Post Discussion
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePostBox({ onSelectMovie }: { onSelectMovie: () => void }) {
  return (
    <section className={cardClass("p-3 sm:p-4")}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm font-semibold text-slate-300 sm:text-base">
          What movie is on your mind?
        </p>
        <button
          type="button"
          onClick={onSelectMovie}
          className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:px-5"
        >
          Select Movie
        </button>
      </div>
    </section>
  );
}

function FilterMenu({
  onSelect,
  options,
  selectedOption,
}: {
  onSelect: (option: string) => void;
  options: string[];
  selectedOption: string;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      const menu = menuRef.current;

      if (menu && !menu.contains(event.target as Node)) {
        menu.removeAttribute("open");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        menuRef.current?.removeAttribute("open");
      }
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const closeOtherMenus = () => {
    const currentMenu = menuRef.current;

    if (!currentMenu?.open) {
      return;
    }

    document
      .querySelectorAll<HTMLDetailsElement>("[data-community-filter-menu]")
      .forEach((menu) => {
        if (menu !== currentMenu) {
          menu.removeAttribute("open");
        }
      });
  };

  return (
    <details
      ref={menuRef}
      data-community-filter-menu
      onToggle={closeOtherMenus}
      className="group relative z-[70]"
    >
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-yellow-400/55 bg-slate-950 px-3 text-[11px] font-black leading-none text-yellow-300 shadow-inner shadow-black/25 outline-none transition hover:border-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-200 sm:min-h-10 sm:px-4 sm:text-xs [&::-webkit-details-marker]:hidden">
        {selectedOption}
        <span
          aria-hidden="true"
          className="transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="absolute left-0 z-[90] mt-2 grid max-h-72 min-w-52 gap-1 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-black/60">
        {options.map((option) => {
          const isSelected = option === selectedOption;

          return (
            <button
              key={option}
              type="button"
              onClick={(event) => {
                onSelect(option);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
              className={`rounded-full border px-3 py-2 text-left text-xs font-black transition ${
                isSelected
                  ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-300"
                  : "border-transparent text-slate-200 hover:bg-yellow-400/10 hover:text-yellow-300"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </details>
  );
}

function CommunityFilters({
  onGenreChange,
  onTrendChange,
  selectedGenre,
  selectedTrend,
}: {
  onGenreChange: (genre: string) => void;
  onTrendChange: (trend: string) => void;
  selectedGenre: string;
  selectedTrend: string;
}) {
  return (
    <section className={cardClass("relative z-[60] overflow-visible p-2")}>
      <div className="flex flex-wrap gap-2">
        <FilterMenu
          onSelect={onGenreChange}
          options={genreFilters}
          selectedOption={selectedGenre}
        />
        <FilterMenu
          onSelect={onTrendChange}
          options={trendFilters}
          selectedOption={selectedTrend}
        />
      </div>
    </section>
  );
}

function CommunityFeedCard({
  currentUserId,
  post,
}: {
  currentUserId?: string | null;
  post: CommunityFeedPost;
}) {
  const isCommentPost = Boolean(post.replyLink);
  const [isReviewExpanded, setIsReviewExpanded] = useState(false);
  const isOwnPost = Boolean(
    currentUserId && post.user.userId && post.user.userId === currentUserId
  );
  const shouldShowReviewToggle = Boolean(post.comment && post.comment.length > 140);
  const shouldClampReview = shouldShowReviewToggle && !isReviewExpanded;

  return (
    <article className={cardClass("p-3.5 sm:p-4")}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <Avatar label={post.user.avatar} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-5 text-slate-200 sm:text-base">
                <span className="font-black text-white">
                  @{post.user.username}
                </span>{" "}
                {post.activity}
                {post.popscore ? (
                  <span
                    className={`ml-1.5 inline-flex rounded-lg border px-1.5 py-0.5 text-xs font-black shadow-lg sm:ml-2 sm:px-2 sm:py-1 sm:text-sm ${scoreBadgeClass(
                      post.popscore
                    )}`}
                  >
                    {post.popscore}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500">
                {isOwnPost ? <span>You</span> : null}
                {isOwnPost ? <span aria-hidden="true">·</span> : null}
                <span>{post.timestamp}</span>
              </p>
            </div>
            <button
              type="button"
              aria-label="More options"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl font-black text-slate-500 transition hover:bg-white/10 hover:text-yellow-300"
            >
              ...
            </button>
          </div>
          {post.user.userId && !isOwnPost ? (
            <FollowButton
              className="mt-2 hidden sm:inline-flex"
              size="sm"
              target={{
                displayName: post.user.displayName,
                userId: post.user.userId,
                username: post.user.username,
              }}
            />
          ) : null}

          <div className="mt-2.5 grid grid-cols-[88px_minmax(0,1fr)] gap-3 sm:mt-3 sm:grid-cols-[110px_1fr] lg:grid-cols-[120px_1fr]">
            <MovieThumb
              alt={post.movie.title}
              fallbackMovieId={post.movie.fallbackMovieId}
              href={communityMovieHref(post.movie.fallbackMovieId)}
              imagePath={post.movie.imagePath}
              wide
            />
            <div className="flex min-w-0 flex-col justify-center">
              {post.reaction ? (
                <div className="flex items-center gap-2">
                  <span className="relative block h-6 w-6 overflow-hidden rounded-full border border-yellow-400/25 bg-black/30 shadow-lg shadow-yellow-400/10 sm:h-7 sm:w-7">
                    <Image
                      src={post.reaction.iconSrc}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-contain"
                      unoptimized
                    />
                  </span>
                  <p
                    className={`text-sm font-black sm:text-base ${post.reaction.accentClass}`}
                  >
                    {post.reaction.label}
                  </p>
                </div>
              ) : null}
              {post.comment ? (
                <div className="mt-1.5">
                  <p
                    className={`max-w-2xl text-sm font-semibold leading-5 text-slate-300 ${
                      isCommentPost
                        ? "rounded-xl border border-slate-800 bg-black/25 p-3"
                        : ""
                    } ${
                      shouldClampReview
                        ? "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]"
                        : ""
                    }`}
                  >
                    {post.comment}
                  </p>
                  {shouldShowReviewToggle ? (
                    <button
                      type="button"
                      aria-expanded={isReviewExpanded}
                      onClick={() =>
                        setIsReviewExpanded((isExpanded) => !isExpanded)
                      }
                      className="mt-1 text-xs font-black text-yellow-300 transition hover:text-yellow-200"
                    >
                      {isReviewExpanded ? "Show Less" : "Read More"}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {post.actionHref && post.actionLabel ? (
                <Link
                  href={post.actionHref}
                  className="mt-3 inline-flex w-fit items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
                >
                  {post.actionLabel}
                </Link>
              ) : null}
              {isCommentPost ? (
                <div className="mt-3 flex flex-wrap items-center gap-5 text-sm font-bold">
                  <button
                    type="button"
                    className="text-slate-300 transition hover:text-yellow-300"
                  >
                    Reply
                  </button>
                  <Link href="/community" className="text-yellow-300">
                    {post.replyLink}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-3">
            <CommunityPostLikeButton
              initialLikeCount={post.likeCount}
              notificationEntityId={post.movie.fallbackMovieId}
              notificationEntityType={post.popscore ? "review" : "movie"}
              notificationMovieTitle={post.movie.title}
              notificationRecipientUserId={post.user.userId}
              notificationRecipientUsername={post.user.username}
              postId={post.id}
            />
            <CommunityPostComments
              initialCommentCount={post.commentCount}
              movieId={post.movie.fallbackMovieId}
              movieTitle={post.movie.title}
              postOwnerUserId={post.user.userId}
              postOwnerUsername={post.user.username}
              postId={post.id}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function FeedPostsList({
  currentUserId,
  emptyMessage,
  posts,
}: {
  currentUserId?: string | null;
  emptyMessage: string;
  posts: CommunityFeedPost[];
}) {
  if (posts.length === 0) {
    return (
      <section className={cardClass("p-6 text-sm font-bold text-slate-300")}>
        {emptyMessage}
      </section>
    );
  }

  return (
    <>
      {posts.map((post) => (
        <CommunityFeedCard
          key={post.id}
          currentUserId={currentUserId}
          post={post}
        />
      ))}
    </>
  );
}

function SidebarCard({
  action,
  children,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className={cardClass("p-4 sm:p-5")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {action ?? (
          <Link
            href="/community"
            className="text-sm font-black text-yellow-300 transition hover:text-yellow-200"
          >
            See All
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function DiscussionBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "spoiler" | "type";
}) {
  const toneClass =
    tone === "spoiler"
      ? "border-red-400/40 bg-red-500/15 text-red-200"
      : tone === "type"
        ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-200"
        : "border-slate-700 bg-slate-900/80 text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-black sm:px-3 sm:py-1 ${toneClass}`}
    >
      {children}
    </span>
  );
}

function CompactTextPreview({
  className = "",
  lines = "three",
  text,
}: {
  className?: string;
  lines?: "two" | "three";
  text: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldToggle = text.length > 140;
  const clampClass =
    lines === "two"
      ? "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
      : "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]";

  return (
    <div>
      <p className={`${className} ${shouldToggle && !isExpanded ? clampClass : ""}`}>
        {text}
      </p>
      {shouldToggle ? (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
          className="mt-1 text-xs font-black text-yellow-300 transition hover:text-yellow-200"
        >
          {isExpanded ? "Show Less" : "Read More"}
        </button>
      ) : null}
    </div>
  );
}

function DiscussionFilters({
  onFilterChange,
  onGenreChange,
  selectedFilter,
  selectedGenre,
}: {
  onFilterChange: (filter: DiscussionFilter) => void;
  onGenreChange: (genre: string) => void;
  selectedFilter: DiscussionFilter;
  selectedGenre: string;
}) {
  return (
    <section className={cardClass("relative z-[60] overflow-visible p-2")}>
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu
          onSelect={onGenreChange}
          options={genreFilters}
          selectedOption={selectedGenre}
        />
        {discussionFilterOptions.map((filter) => {
          const isSelected = filter === selectedFilter;

          return (
            <button
              key={filter}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onFilterChange(filter)}
              className={`min-h-9 rounded-full border px-3 text-[11px] font-black transition sm:min-h-10 sm:px-4 sm:text-xs ${
                isSelected
                  ? "border-yellow-400/60 bg-yellow-400/10 text-yellow-300 shadow-inner shadow-black/20"
                  : "border-slate-700 bg-slate-950/90 text-slate-100 hover:border-yellow-400/60 hover:bg-yellow-400/10 hover:text-yellow-200"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DiscussionCard({
  discussion,
}: {
  discussion: CommunityDiscussion;
}) {
  return (
    <article className={cardClass("p-3 transition hover:border-yellow-400/40 hover:bg-slate-950/90 sm:p-4")}>
      <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-3 sm:grid-cols-[96px_1fr] sm:gap-4">
        <MovieThumb
          alt={discussion.movieTitle}
          fallbackMovieId={discussion.movieId}
          href={communityMovieHref(discussion.movieId)}
          imagePath={discussion.moviePosterUrl}
          wide
        />

        <div className="min-w-0">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-black leading-5 text-white sm:text-lg sm:leading-6">
                {discussion.title}
              </h3>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-400 sm:text-sm">
                <span className="text-slate-200">{discussion.movieTitle}</span>
                {" • "}
                {discussion.commentCount} comments
                {" • "}
                {discussion.likeCount} likes
                {" • "}
                Active {formatRelativePostTime(discussion.lastActiveAt)}
              </p>
            </div>
            <Link
              href={communityDiscussionHref(discussion.id)}
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:px-4 sm:py-2 sm:text-sm"
            >
              Join Discussion
            </Link>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Avatar label={discussion.startedByAvatarUrl} size="sm" />
            <p className="min-w-0 truncate text-xs font-bold text-slate-300 sm:text-sm">
              Started by{" "}
              <span className="font-black text-white">
                {discussion.startedByDisplayName}
              </span>
              {discussion.startedByUsername ? (
                <span className="text-slate-500">
                  {" "}
                  @{discussion.startedByUsername}
                </span>
              ) : null}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
            <DiscussionBadge tone="type">{discussion.type}</DiscussionBadge>
            {discussion.tags.map((tag) => (
              <DiscussionBadge key={tag}>{tag}</DiscussionBadge>
            ))}
            {discussion.isSpoiler ? (
              <DiscussionBadge tone="spoiler">Spoilers</DiscussionBadge>
            ) : (
              <DiscussionBadge>Spoiler-Free</DiscussionBadge>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function DiscussionsTabContent({
  discussions,
  onStartDiscussion,
}: {
  discussions: CommunityDiscussion[];
  onStartDiscussion: () => void;
}) {
  const [selectedFilter, setSelectedFilter] =
    useState<DiscussionFilter>("Trending");
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const visibleDiscussions = useMemo(
    () => getVisibleDiscussions(discussions, selectedFilter, selectedGenre),
    [discussions, selectedFilter, selectedGenre]
  );

  return (
    <div className="space-y-3 sm:space-y-5">
      <section className={cardClass("p-3 sm:p-5")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white sm:text-2xl">
              Discussions
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400 sm:text-sm">
              Jump into movie conversations happening right now.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartDiscussion}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:px-5 sm:py-3"
          >
            + Start Discussion
          </button>
        </div>
      </section>

      <DiscussionFilters
        onFilterChange={setSelectedFilter}
        onGenreChange={setSelectedGenre}
        selectedFilter={selectedFilter}
        selectedGenre={selectedGenre}
      />

      <div className="space-y-3 sm:space-y-4">
        {visibleDiscussions.length > 0 ? (
          visibleDiscussions.map((discussion) => (
            <DiscussionCard key={discussion.id} discussion={discussion} />
          ))
        ) : (
          <section className={cardClass("p-6 text-sm font-bold text-slate-300")}>
            No discussions match those filters yet.
          </section>
        )}
      </div>
    </div>
  );
}

function TrendingDiscussionsCard({
  discussions,
  onSeeAll,
}: {
  discussions: CommunityDiscussion[];
  onSeeAll: () => void;
}) {
  const trendingDiscussions = getVisibleDiscussions(
    discussions,
    "Trending",
    "All Genres"
  ).slice(0, 3);

  return (
    <SidebarCard
      title="Trending Discussions"
      action={
        <button
          type="button"
          onClick={onSeeAll}
          className="text-sm font-black text-yellow-300 transition hover:text-yellow-200"
        >
          See All
        </button>
      }
    >
      <div className="space-y-4">
        {trendingDiscussions.map((discussion) => (
          <div
            key={discussion.id}
            className="grid grid-cols-[82px_1fr] items-center gap-3 border-b border-white/10 pb-4 last:border-b-0 last:pb-0"
          >
            <MovieThumb
              alt={discussion.title}
              fallbackMovieId={discussion.movieId}
              fit="contain"
              href={communityDiscussionHref(discussion.id)}
              imagePath={discussion.moviePosterUrl}
            />
            <div className="min-w-0">
              <p className="text-sm font-black leading-5 text-white">
                {discussion.title}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">
                {discussion.commentCount} comments
              </p>
            </div>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}

function WhoToFollowCard({
  emptyMessage = "No users match those filters yet.",
  users = [],
}: {
  emptyMessage?: string;
  users?: SuggestedFollow[];
}) {
  const followingIds = useFollowingIds();
  const followingSet = useMemo(() => new Set(followingIds), [followingIds]);
  const visibleUsers = useMemo(
    () => users.filter((user) => !followingSet.has(user.userId)).slice(0, 4),
    [followingSet, users]
  );

  return (
    <SidebarCard title="Who to Follow">
      <div className="space-y-4">
        {visibleUsers.length > 0 ? (
          visibleUsers.map((user) => (
            <div key={user.username} className="flex items-center gap-3">
              <Avatar label={user.avatar} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-black text-white">{user.displayName}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
                  @{user.username}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-300">
                  Favorite: {user.favoriteGenre}
                </p>
              </div>
              <FollowButton
                size="sm"
                target={{
                  displayName: user.displayName,
                  userId: user.userId,
                  username: user.username,
                }}
              />
            </div>
          ))
        ) : (
          <p className="text-sm font-bold text-slate-400">{emptyMessage}</p>
        )}
      </div>
    </SidebarCard>
  );
}

function ratingCountText(count: number) {
  return `${count} review${count === 1 ? "" : "s"} submitted`;
}

function TopReviewersList({
  reviewers,
}: {
  reviewers: TopReviewerSummary[];
}) {
  return (
    <div className="space-y-3">
      {reviewers.map((reviewer, index) => (
        <div
          key={reviewer.userId}
          className="grid grid-cols-[24px_40px_minmax(0,1fr)_auto] items-center gap-3"
        >
          <span className="text-sm font-black text-white">{index + 1}</span>
          <Avatar label={reviewer.avatar} />
          <div className="min-w-0">
            <p className="truncate font-black text-white">{reviewer.username}</p>
            <p className="mt-1 text-xs font-bold text-slate-300">
              {ratingCountText(reviewer.totalReviews)}
            </p>
          </div>
          <FollowButton
            size="sm"
            target={{
              displayName: reviewer.username,
              userId: reviewer.userId,
              username: reviewer.username,
            }}
          />
        </div>
      ))}
    </div>
  );
}

function TopReviewersCard({
  isLoading,
  reviewers,
}: {
  isLoading: boolean;
  reviewers: TopReviewerSummary[];
}) {
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const previewReviewers = reviewers.slice(0, 5);
  const leaderboardReviewers = reviewers.slice(0, 150);

  return (
    <SidebarCard
      title="Top Reviewers"
      action={
        reviewers.length > 0 ? (
          <button
            type="button"
            onClick={() => setIsLeaderboardOpen(true)}
            className="text-sm font-black text-yellow-300 transition hover:text-yellow-200"
          >
            See All
          </button>
        ) : (
          <span />
        )
      }
    >
      {isLoading ? (
        <p className="text-sm font-bold text-slate-400">Loading reviewers...</p>
      ) : previewReviewers.length > 0 ? (
        <TopReviewersList reviewers={previewReviewers} />
      ) : (
        <p className="text-sm font-bold text-slate-400">
          No reviewer rankings yet.
        </p>
      )}

      {isLeaderboardOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Top 150 raters"
          className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-16 backdrop-blur-sm"
          onMouseDown={() => setIsLeaderboardOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/70 sm:p-5"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">
                  Top 150 Raters
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  Ranked by total reviews submitted.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close top raters"
                onClick={() => setIsLeaderboardOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-sm font-black text-slate-300 transition hover:border-yellow-400/60 hover:text-yellow-300"
              >
                X
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-800 bg-black/25 p-3">
              <TopReviewersList reviewers={leaderboardReviewers} />
            </div>
          </div>
        </div>
      ) : null}
    </SidebarCard>
  );
}

function FollowingActivityCard({
  activity,
}: {
  activity: FollowingActivity;
}) {
  if (activity.type === "discussion_created") {
    return (
      <article className={cardClass("p-3 sm:p-4")}>
        <div className="flex items-start gap-2.5 sm:gap-3">
          <Avatar label={activity.avatar} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-5 text-slate-300">
              <span className="font-black text-white">
                @{activity.username}
              </span>{" "}
              started a discussion
            </p>
            <h3 className="mt-1 text-base font-black leading-5 text-white sm:text-lg">
              {activity.discussionTitle}
            </h3>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-400 sm:text-sm">
              {activity.movieTitle ? `${activity.movieTitle} • ` : ""}
              {activity.replyCount} replies •{" "}
              {formatRelativePostTime(activity.createdAt)}
            </p>
            <Link
              href={communityDiscussionHref(activity.discussionId)}
              className="mt-2 inline-flex min-h-9 items-center rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:mt-3 sm:px-4 sm:py-2 sm:text-sm"
            >
              Join Discussion
            </Link>
          </div>
        </div>
      </article>
    );
  }

  if (activity.type === "discussion_comment") {
    return (
      <article className={cardClass("p-3 sm:p-4")}>
        <div className="flex items-start gap-2.5 sm:gap-3">
          <Avatar label={activity.avatar} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-5 text-slate-300">
              <span className="font-black text-white">
                @{activity.username}
              </span>{" "}
              commented in a discussion
            </p>
            <h3 className="mt-1 text-base font-black leading-5 text-white sm:text-lg">
              {activity.discussionTitle}
            </h3>
            <div className="mt-2 rounded-xl border border-slate-800 bg-black/25 p-2.5">
              <CompactTextPreview
                lines="two"
                text={activity.commentPreview}
                className="text-sm font-semibold leading-5 text-slate-300"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-xs font-bold text-slate-400 sm:text-sm">
                {activity.movieTitle ? `${activity.movieTitle} • ` : ""}
                {formatRelativePostTime(activity.createdAt)}
              </p>
              <Link
                href={communityDiscussionHref(activity.discussionId)}
                className="text-xs font-black text-yellow-300 transition hover:text-yellow-200 sm:text-sm"
              >
                View Discussion
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={cardClass("p-3 sm:p-4")}>
      <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-3 sm:grid-cols-[96px_1fr]">
        <MovieThumb
          alt={activity.movieTitle}
          fallbackMovieId={activity.movieId}
          href={communityMovieHref(activity.movieId)}
          imagePath={activity.moviePoster}
          wide
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Avatar label={activity.avatar} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-5 text-slate-300">
                <span className="font-black text-white">
                  @{activity.username}
                </span>{" "}
                {activity.type === "rating" ? "rated" : "reacted to"}{" "}
                {activity.movieTitle}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {formatRelativePostTime(activity.createdAt)}
              </p>
            </div>
          </div>

          {activity.type === "rating" ? (
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="rounded-xl border border-yellow-400/35 bg-yellow-400/15 px-2 py-0.5 text-xs font-black text-yellow-200 sm:px-3 sm:py-1 sm:text-sm">
                  PopScore: {activity.popScore}
                </span>
                <span className="rounded-xl border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-xs font-black text-slate-300 sm:px-3 sm:py-1">
                  {activity.genre}
                </span>
                {activity.reaction ? (
                  <span className="rounded-xl border border-yellow-400/35 bg-yellow-400/10 px-2 py-0.5 text-xs font-black text-yellow-200 sm:px-3 sm:py-1">
                    {quickReactionLabel(activity.reaction)}
                  </span>
                ) : null}
              </div>
              {activity.comment ? (
                <div className="mt-2 rounded-xl border border-slate-800 bg-black/25 p-2.5">
                  <CompactTextPreview
                    lines="three"
                    text={activity.comment}
                    className="text-sm font-semibold leading-5 text-slate-300"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 inline-flex rounded-xl border border-yellow-400/35 bg-yellow-400/15 px-2.5 py-1.5 text-xs font-black text-yellow-200 sm:px-3 sm:py-2 sm:text-sm">
              {quickReactionLabel(activity.reaction)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function FollowingTabContent({
  discussions,
  onFindPeople,
}: {
  discussions: CommunityDiscussion[];
  onFindPeople: () => void;
}) {
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [ratings, setRatings] = useState<CommunityRatingFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const activities = useMemo(
    () =>
      buildFollowingActivities({
        discussions,
        followingIds,
        ratings,
      }),
    [discussions, followingIds, ratings]
  );

  useEffect(() => {
    let isCurrent = true;

    const loadFollowingFeed = () => {
      setIsLoading(true);
      getFollowingUserIdsForCurrentUser()
        .then(async (nextFollowingIds) => {
          const nextRatings = nextFollowingIds.length
            ? await getRecentRatingsForUsers(nextFollowingIds, 60)
            : [];

          if (!isCurrent) {
            return;
          }

          setFollowingIds(nextFollowingIds);
          setRatings(nextRatings);
        })
        .catch(() => {
          if (isCurrent) {
            setFollowingIds([]);
            setRatings([]);
          }
        })
        .finally(() => {
          if (isCurrent) {
            setIsLoading(false);
          }
        });
    };

    loadFollowingFeed();
    window.addEventListener(FOLLOWS_UPDATED_EVENT, loadFollowingFeed);

    return () => {
      isCurrent = false;
      window.removeEventListener(FOLLOWS_UPDATED_EVENT, loadFollowingFeed);
    };
  }, []);

  if (isLoading) {
    return (
      <section className={cardClass("p-4 text-sm font-bold text-slate-300")}>
        Loading your Following feed...
      </section>
    );
  }

  if (followingIds.length === 0) {
    return (
      <section className={cardClass("p-5 text-center sm:p-8")}>
        <h2 className="text-xl font-black text-white sm:text-2xl">
          Your Following feed is waiting for some movie taste.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-400">
          Follow other PopScore fans to see the movies they rate, react to, and
          discuss.
        </p>
        <button
          type="button"
          onClick={onFindPeople}
          className="mt-4 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:mt-5 sm:px-5 sm:py-3"
        >
          Find People to Follow
        </button>
      </section>
    );
  }

  if (activities.length === 0) {
    return (
      <section className={cardClass("p-4 text-sm font-bold text-slate-300")}>
        The people you follow have not posted movie activity yet.
      </section>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      {activities.map((activity) => (
        <FollowingActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

function PeopleCard({ user }: { user: SuggestedFollow }) {
  return (
    <article className={cardClass("p-3 sm:p-4")}>
      <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3">
        <Avatar label={user.avatar} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-black text-white sm:text-lg">
            {user.displayName}
          </h3>
          <p className="mt-0.5 truncate text-xs font-bold text-slate-500 sm:text-sm">
            @{user.username}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-black sm:gap-2">
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-slate-300 sm:px-3 sm:py-1">
              Favorite Genre: {user.favoriteGenre}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-slate-300 sm:px-3 sm:py-1">
              {user.totalReviews} Reviews
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-slate-300 sm:px-3 sm:py-1">
              {formatCompactCount(user.followersCount)} Followers
            </span>
          </div>
        </div>
        <FollowButton
          className="shrink-0"
          size="sm"
          target={{
            displayName: user.displayName,
            userId: user.userId,
            username: user.username,
          }}
        />
      </div>
    </article>
  );
}

function PeopleTabContent({ users }: { users: SuggestedFollow[] }) {
  const [userSearch, setUserSearch] = useState("");
  const [selectedFavoriteGenre, setSelectedFavoriteGenre] =
    useState("All Genres");
  const followingIds = useFollowingIds();
  const visibleUsers = useMemo(() => {
    const normalizedSearch = userSearch.trim().toLowerCase();
    const followingSet = new Set(followingIds);

    return users.filter((user) => {
      if (followingSet.has(user.userId)) {
        return false;
      }

      const matchesSearch =
        !normalizedSearch ||
        user.displayName.toLowerCase().includes(normalizedSearch) ||
        user.username.toLowerCase().includes(normalizedSearch);
      const matchesGenre =
        selectedFavoriteGenre === "All Genres" ||
        user.favoriteGenre === selectedFavoriteGenre;

      return matchesSearch && matchesGenre;
    });
  }, [followingIds, selectedFavoriteGenre, userSearch, users]);

  return (
    <div className="w-full space-y-3 sm:space-y-5">
      <section className={cardClass("relative z-[60] overflow-visible p-2 sm:p-3")}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="flex min-h-9 items-center gap-2 rounded-full border border-slate-800 bg-black/35 px-3 text-xs font-bold text-slate-400 shadow-inner shadow-black/20 sm:min-h-10 sm:text-sm">
            <span aria-hidden="true" className="text-lg">
              ⌕
            </span>
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
              placeholder="Search users..."
              type="search"
            />
          </label>
          <FilterMenu
            onSelect={setSelectedFavoriteGenre}
            options={genreFilters}
            selectedOption={selectedFavoriteGenre}
          />
        </div>
      </section>

      {visibleUsers.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
          {visibleUsers.map((user) => (
            <PeopleCard key={user.username} user={user} />
          ))}
        </div>
      ) : (
        <section className={cardClass("p-4 text-sm font-bold text-slate-300")}>
          No users match those filters yet.
        </section>
      )}
    </div>
  );
}

export default function CommunityPage() {
  const [selectedTab, setSelectedTab] = useState<CommunityTab>("Feed");
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const [selectedTrend, setSelectedTrend] = useState("Trending");
  const [isMovieDialogOpen, setIsMovieDialogOpen] = useState(false);
  const [isDiscussionDialogOpen, setIsDiscussionDialogOpen] = useState(false);
  const [createdDiscussions, setCreatedDiscussions] = useState<
    CommunityDiscussion[]
  >([]);
  const [communityRatings, setCommunityRatings] = useState<
    CommunityRatingFeedItem[]
  >([]);
  const [discoverableUsers, setDiscoverableUsers] = useState<SuggestedFollow[]>(
    []
  );
  const [topReviewers, setTopReviewers] = useState<TopReviewerSummary[]>([]);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const communityDiscussions = useMemo(
    () => [...createdDiscussions, ...mockCommunityDiscussions],
    [createdDiscussions]
  );
  const realFeedPosts = useMemo(
    () => communityRatings.map(mapCommunityRatingToPost),
    [communityRatings]
  );
  const feedPostsToShow = useMemo(
    () => (realFeedPosts.length > 0 ? realFeedPosts : feedPosts),
    [realFeedPosts]
  );
  const visibleFeedPosts = useMemo(
    () => getVisibleFeedPosts(feedPostsToShow, selectedGenre, selectedTrend),
    [feedPostsToShow, selectedGenre, selectedTrend]
  );
  const showSocialSidebar =
    selectedTab === "Feed" || selectedTab === "Discussions";
  const showDiscussions = () => {
    setSelectedTab("Discussions");
    window.requestAnimationFrame(() => {
      window.scrollTo({ behavior: "smooth", top: 0 });
    });
  };

  const saveCreatedDiscussions = (nextDiscussions: CommunityDiscussion[]) => {
    window.localStorage.setItem(
      communityDiscussionsStorageKey,
      JSON.stringify(nextDiscussions)
    );
  };

  const postDiscussion = (discussion: CommunityDiscussion) => {
    setCreatedDiscussions((currentDiscussions) => {
      const nextDiscussions = [
        discussion,
        ...currentDiscussions.filter(
          (currentDiscussion) => currentDiscussion.id !== discussion.id
        ),
      ];

      saveCreatedDiscussions(nextDiscussions);

      return nextDiscussions;
    });
    setIsDiscussionDialogOpen(false);
    setSelectedTab("Discussions");
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCreatedDiscussions(
        parseStoredCommunityDiscussions(
          window.localStorage.getItem(communityDiscussionsStorageKey)
        )
      );
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    getCurrentUser()
      .then((user) => {
        if (isCurrent) {
          setCurrentUserId(user?.id ?? null);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setCurrentUserId(null);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    Promise.all([
      getRecentCommunityRatings(30),
      getTopReviewers(150),
      getDiscoverableUsers(80),
    ])
      .then(([ratings, reviewers, users]) => {
        if (isCurrent) {
          setCommunityRatings(ratings);
          setTopReviewers(reviewers);
          setDiscoverableUsers(users);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setCommunityRatings([]);
          setDiscoverableUsers([]);
          setTopReviewers([]);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingReviewers(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-black bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,0.14),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_38%,#000_74%,#020617_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:radial-gradient(rgba(250,204,21,0.24)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <SiteHeader />

        <section className="py-7 sm:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black text-white sm:text-5xl">
                Community
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                Discover what movie fans are loving, debating, rating, and
                talking about right now.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <CommunityTabs selectedTab={selectedTab} onSelect={setSelectedTab} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="space-y-4 sm:space-y-5">
            {selectedTab === "Feed" ? (
              <>
                <CreatePostBox onSelectMovie={() => setIsMovieDialogOpen(true)} />
                <CommunityFilters
                  onGenreChange={setSelectedGenre}
                  onTrendChange={setSelectedTrend}
                  selectedGenre={selectedGenre}
                  selectedTrend={selectedTrend}
                />
                <FeedPostsList
                  currentUserId={currentUserId}
                  posts={visibleFeedPosts}
                  emptyMessage="No posts match that filter yet."
                />
              </>
            ) : selectedTab === "Following" ? (
              <FollowingTabContent
                discussions={communityDiscussions}
                onFindPeople={() => setSelectedTab("People")}
              />
            ) : selectedTab === "Discussions" ? (
              <DiscussionsTabContent
                discussions={communityDiscussions}
                onStartDiscussion={() => setIsDiscussionDialogOpen(true)}
              />
            ) : (
              <PeopleTabContent users={discoverableUsers} />
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            {showSocialSidebar ? (
              <>
                <TrendingDiscussionsCard
                  discussions={communityDiscussions}
                  onSeeAll={showDiscussions}
                />
                <WhoToFollowCard users={discoverableUsers} />
              </>
            ) : null}
            <TopReviewersCard
              isLoading={isLoadingReviewers}
              reviewers={topReviewers}
            />
          </aside>
        </section>
      </section>
      {isMovieDialogOpen ? (
        <SelectMovieDialog onClose={() => setIsMovieDialogOpen(false)} />
      ) : null}
      {isDiscussionDialogOpen ? (
        <StartDiscussionModal
          onClose={() => setIsDiscussionDialogOpen(false)}
          onPost={postDiscussion}
        />
      ) : null}
    </main>
  );
}
