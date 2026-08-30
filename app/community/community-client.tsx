"use client";

import Image from "next/image";
import EmojiIcon from "@/app/components/emoji-icon";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommunityPostComments from "@/app/components/community-post-comments";
import FollowButton from "@/app/components/follow-button";
import CommunityPostLikeButton from "@/app/components/community-post-like-button";
import MentionText from "@/app/components/mention-text";
import MentionTextarea from "@/app/components/mention-textarea";
import MoviePosterImage from "@/app/components/movie-poster-image";
import ProfileUsernameLink from "@/app/components/profile-username-link";
import SiteHeader from "@/app/components/site-header";
import { usePopFile } from "@/app/components/popfile-provider";
import {
  communityDiscussionHref,
  communityDiscussionsStorageKey,
  discussionFilterOptions,
  discussionTypes,
  parseStoredCommunityDiscussions,
  type CommunityDiscussion,
  type DiscussionFilter,
  type DiscussionType,
} from "@/lib/community-discussions";
import {
  COMMUNITY_DISCUSSIONS_UPDATED_EVENT,
  createCommunityDiscussion,
  getCommunityDiscussions,
  mergeCommunityDiscussions,
  notifyCommunityDiscussionsUpdated,
} from "@/lib/community-discussions-store";
import { checkAchievementEmails } from "@/lib/achievement-email-notifications";
import { avatarForKey } from "@/lib/profile-config";
import {
  FOLLOWS_UPDATED_EVENT,
  getFollowingUserIdsForCurrentUser,
} from "@/lib/follows";
import {
  COMMUNITY_POST_ACTIVITY_UPDATED_EVENT,
  getCommunityPostActivitySummaries,
  type CommunityPostActivitySummary,
} from "@/lib/community-comments";
import {
  getCurrentUser,
  getDiscoverableUsers,
  getProfileByUserId,
  getRecentCommunityRatings,
  getRecentRatingsForUsers,
  getSupabaseAccessToken,
  getTopReviewers,
  type CommunityRatingFeedItem,
  type DiscoverableUserSummary,
  type TopReviewerSummary,
} from "@/lib/profile-store";
import {
  getCurrentNotificationActor,
  NOTIFICATION_TARGET_CHANGED_EVENT,
} from "@/lib/notifications";
import {
  mergeMentionableUsers,
  notifyMentionedUsers,
  type MentionableUser,
} from "@/lib/mentions";
import { posterUrl } from "@/lib/tmdb";
import { movieHref } from "@/lib/urls";
import type { CommunityOverview } from "@/lib/community-overview";

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
  createdAt: string;
  genres: string[];
  id: string;
  interactedAvatars: string[];
  extraInteractions: number;
  lastActivityAt?: string;
  likeCount: number;
  movie: {
    fallbackMovieId: string;
    imagePath: string | null;
    title: string;
  };
  popscore?: number;
  recentCommentCount?: number;
  recentLikeCount?: number;
  reaction?: PopScoreReaction;
  replyLink?: string;
  sortCommentCount?: number;
  sortLikeCount?: number;
  timestamp: string;
  user: CommunityUser;
};

type SuggestedFollow = DiscoverableUserSummary;

type DiscussionAuthor = {
  avatar: string;
  displayName: string;
  userId: string;
  username: string;
};

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
  "Superhero",
  "Thriller",
  "War",
  "Western",
];

const trendFilters = ["Trending", "Newest", "Most Liked", "Most Commented"];

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

function getFeedTimeValue(value?: string | null) {
  const time = value ? new Date(value).getTime() : Number.NaN;

  return Number.isNaN(time) ? 0 : time;
}

function compareFeedPostsByNewest(
  firstPost: CommunityFeedPost,
  secondPost: CommunityFeedPost
) {
  return (
    getFeedTimeValue(secondPost.createdAt) - getFeedTimeValue(firstPost.createdAt)
  );
}

function compareFeedPostsByLastActivity(
  firstPost: CommunityFeedPost,
  secondPost: CommunityFeedPost
) {
  return (
    getFeedTimeValue(secondPost.lastActivityAt ?? secondPost.createdAt) -
    getFeedTimeValue(firstPost.lastActivityAt ?? firstPost.createdAt)
  );
}

function getFeedSortCommentCount(post: CommunityFeedPost) {
  return post.sortCommentCount ?? post.commentCount;
}

function getFeedSortLikeCount(post: CommunityFeedPost) {
  return post.sortLikeCount ?? post.likeCount;
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
      (a, b) =>
        getFeedSortLikeCount(b) - getFeedSortLikeCount(a) ||
        getFeedSortCommentCount(b) - getFeedSortCommentCount(a) ||
        compareFeedPostsByNewest(a, b)
    );
  }

  if (selectedTrend === "Most Commented") {
    return sortedPosts.sort(
      (a, b) =>
        getFeedSortCommentCount(b) - getFeedSortCommentCount(a) ||
        getFeedSortLikeCount(b) - getFeedSortLikeCount(a) ||
        compareFeedPostsByNewest(a, b)
    );
  }

  if (selectedTrend === "Newest") {
    return sortedPosts.sort(compareFeedPostsByNewest);
  }

  return sortedPosts.sort(
    (a, b) =>
      (b.recentCommentCount ?? getFeedSortCommentCount(b)) -
        (a.recentCommentCount ?? getFeedSortCommentCount(a)) ||
      (b.recentLikeCount ?? getFeedSortLikeCount(b)) -
        (a.recentLikeCount ?? getFeedSortLikeCount(a)) ||
      compareFeedPostsByLastActivity(a, b) ||
      getFeedSortCommentCount(b) - getFeedSortCommentCount(a) ||
      getFeedSortLikeCount(b) - getFeedSortLikeCount(a) ||
      compareFeedPostsByNewest(a, b)
  );
}

function feedPostMatchesMovieSearch(post: CommunityFeedPost, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    post.movie.title,
    post.activity,
    post.comment ?? "",
    ...post.genres,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

function discussionMatchesSearch(
  discussion: CommunityDiscussion,
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    discussion.title,
    discussion.body,
    discussion.movieTitle,
    discussion.movieYear,
    discussion.type,
    ...discussion.tags,
    ...discussion.movieGenres,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
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

function communityMovieHref(movieId: string, movieTitle?: string) {
  return movieHref({ id: movieId, title: movieTitle ?? "movie" });
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
    fantasy: "Fantasy",
    super_hero: "Superhero",
    superhero: "Superhero",
    western: "Western",
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
  const createdAt = rating.created_at;

  return {
    activity: `rated ${rating.movieTitle}`,
    comment: rating.reviewComment ?? undefined,
    commentCount: 0,
    createdAt,
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
    timestamp: formatRelativePostTime(createdAt),
    user: {
      avatar: rating.avatar,
      displayName: rating.username,
      userId: rating.user_id,
      username: rating.username,
    },
  };
}

function applyFeedActivitySummaries(
  posts: CommunityFeedPost[],
  summaries: Record<string, CommunityPostActivitySummary>
) {
  return posts.map((post) => {
    const summary = summaries[post.id];

    if (!summary) {
      return post;
    }

    return {
      ...post,
      lastActivityAt: summary.lastActivityAt,
      recentCommentCount: summary.recentCommentCount,
      recentLikeCount: summary.recentLikeCount,
      sortCommentCount: summary.commentCount,
      sortLikeCount: summary.likeCount,
    };
  });
}

function quickReactionLabel(reaction: FollowingReaction) {
  const labels: Record<FollowingReaction, string> = {
    loved_it: "Loved It",
    trash: "Trash",
    worth_watching: "Worth Watching",
  };

  return labels[reaction];
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

  activities.push(
    ...realRatingActivities,
    ...discussionCreatedActivities
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
      <EmojiIcon emoji={label} size={size === "xl" ? 34 : size === "lg" ? 28 : size === "sm" ? 16 : 22} />
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
                    alt={`${movie.title} movie poster`}
                    className="object-cover"
                    fallbackMovieId={String(movie.id)}
                    sizes="54px"
                    src={posterUrl(movie.posterPath ?? null)}
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
              alt={`${selectedMovie.title} selected movie poster`}
              className="object-cover"
              fallbackMovieId={String(selectedMovie.id)}
              sizes="76px"
              src={posterUrl(selectedMovie.posterPath ?? null)}
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

function DiscussionTypeDropdown({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: DiscussionType | "") => void;
  value: DiscussionType | "";
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const selectedLabel = value || "Choose one";
  const options: (DiscussionType | "")[] = ["", ...discussionTypes];

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

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="flex min-h-12 w-full cursor-not-allowed items-center justify-between rounded-2xl border border-slate-700 bg-black/20 px-4 text-left text-sm font-black text-slate-500"
      >
        {selectedLabel}
        <span aria-hidden="true">▾</span>
      </button>
    );
  }

  return (
    <details ref={menuRef} className="group relative z-[140]">
      <summary className="flex min-h-12 w-full cursor-pointer list-none items-center justify-between rounded-2xl border border-slate-700 bg-black/35 px-4 text-left text-sm font-black text-white outline-none transition hover:border-yellow-400/70 hover:bg-yellow-400/10 focus:border-yellow-400/70 group-open:border-yellow-400/70 [&::-webkit-details-marker]:hidden">
        {selectedLabel}
        <span
          aria-hidden="true"
          className="text-yellow-300 transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="absolute left-0 right-0 z-[160] mt-2 grid max-h-72 gap-1 overflow-y-auto rounded-2xl border border-yellow-400/40 bg-slate-950 p-2 shadow-2xl shadow-black/70 ring-1 ring-yellow-400/10">
        {options.map((option) => {
          const label = option || "Choose one";
          const isSelected = option === value;

          return (
            <button
              key={label}
              type="button"
              onClick={(event) => {
                onChange(option);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-black transition ${
                isSelected
                  ? "border-yellow-400/60 bg-yellow-400/15 text-yellow-300"
                  : "border-transparent text-slate-100 hover:bg-yellow-400/10 hover:text-yellow-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </details>
  );
}

function StartDiscussionModal({
  mentionableUsers,
  onClose,
  onPost,
}: {
  mentionableUsers: MentionableUser[];
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
  const [author, setAuthor] = useState<DiscussionAuthor | null>(null);
  const [authorMessage, setAuthorMessage] = useState("");
  const canPost = Boolean(author && selectedMovie && title.trim() && discussionType);

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
    let isCurrent = true;

    getCurrentUser()
      .then(async (user) => {
        if (!user) {
          return null;
        }

        const profile = await getProfileByUserId(user.id).catch(() => null);

        return { profile, user };
      })
      .then((context) => {
        if (!isCurrent) {
          return;
        }

        if (!context?.user) {
          setAuthor(null);
          setAuthorMessage(
            "Create or sign in to your PopFile to start discussions."
          );
          return;
        }

        const { profile, user } = context;

        setAuthor({
          avatar: profile ? avatarForKey(profile.avatar_key).icon : "🔥",
          displayName:
            profile?.username ?? user.email?.split("@")[0] ?? "PopScore Fan",
          userId: user.id,
          username: profile?.username ?? user.email?.split("@")[0] ?? "popscorefan",
        });
        setAuthorMessage("");
      })
      .catch(() => {
        if (isCurrent) {
          setAuthor(null);
          setAuthorMessage(
            "Create or sign in to your PopFile to start discussions."
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const postDiscussion = () => {
    if (!author || !selectedMovie || !title.trim() || !discussionType) {
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
      startedByAvatarUrl: author.avatar,
      startedByDisplayName: author.displayName,
      startedByUserId: author.userId,
      startedByUsername: author.username,
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

              <MentionTextarea
                disabled={!selectedMovie}
                mentionableUsers={mentionableUsers}
                value={body}
                onChange={setBody}
                placeholder="Share your thoughts to get the conversation started..."
                className="min-h-28 w-full resize-none rounded-2xl border border-slate-700 bg-black/35 px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70 disabled:cursor-not-allowed"
              />

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Discussion Type
                  </span>
                  <DiscussionTypeDropdown
                    disabled={!selectedMovie}
                    value={discussionType}
                    onChange={setDiscussionType}
                  />
                </div>

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
          {authorMessage ? (
            <p className="self-center text-sm font-bold text-yellow-200 sm:mr-auto">
              {authorMessage}
            </p>
          ) : null}
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

function FeedSearchInput({
  onSearchChange,
  searchQuery,
}: {
  onSearchChange: (query: string) => void;
  searchQuery: string;
}) {
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <label
      htmlFor="community-feed-movie-search"
      className="block w-full min-w-0 sm:w-64 lg:w-72 xl:w-80"
    >
      <span className="sr-only">
        Search movies and comments in the community feed
      </span>
      <div className="relative">
        <input
          id="community-feed-movie-search"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search Movie"
          className="min-h-10 w-full rounded-full border border-slate-700 bg-black/35 px-4 pr-11 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70"
        />
        {hasSearchQuery ? (
          <button
            type="button"
            aria-label="Clear feed movie search"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-black text-slate-300 transition hover:border-yellow-400/60 hover:bg-yellow-400/10 hover:text-yellow-300"
          >
            X
          </button>
        ) : null}
      </div>
    </label>
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
  onSearchChange,
  onTrendChange,
  searchQuery,
  selectedGenre,
  selectedTrend,
}: {
  onGenreChange: (genre: string) => void;
  onSearchChange: (query: string) => void;
  onTrendChange: (trend: string) => void;
  searchQuery: string;
  selectedGenre: string;
  selectedTrend: string;
}) {
  return (
    <section className={cardClass("relative z-[60] overflow-visible p-2")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <FeedSearchInput
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
        <div className="flex flex-wrap gap-2 sm:justify-end">
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
      </div>
    </section>
  );
}

function CommunityFeedCard({
  currentUserId,
  mentionableUsers,
  post,
}: {
  currentUserId?: string | null;
  mentionableUsers: MentionableUser[];
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
    <article
      id={`post-${post.id}`}
      className={cardClass(
        "scroll-mt-28 p-3.5 transition target:border-yellow-400/70 target:bg-yellow-400/10 sm:p-4"
      )}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <Avatar label={post.user.avatar} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-5 text-slate-200 sm:text-base">
                <ProfileUsernameLink
                  username={post.user.username}
                  className="font-black text-white"
                >
                  @{post.user.username}
                </ProfileUsernameLink>{" "}
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
              alt={`${post.movie.title} movie poster`}
              fallbackMovieId={post.movie.fallbackMovieId}
              href={communityMovieHref(
                post.movie.fallbackMovieId,
                post.movie.title
              )}
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
                    <MentionText text={post.comment} />
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
              mentionableUsers={mentionableUsers}
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
  mentionableUsers,
  posts,
}: {
  currentUserId?: string | null;
  emptyMessage: string;
  mentionableUsers: MentionableUser[];
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
          mentionableUsers={mentionableUsers}
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
  onSearchChange,
  onStartDiscussion,
  searchQuery,
  selectedFilter,
  selectedGenre,
}: {
  onFilterChange: (filter: DiscussionFilter) => void;
  onGenreChange: (genre: string) => void;
  onSearchChange: (query: string) => void;
  onStartDiscussion: () => void;
  searchQuery: string;
  selectedFilter: DiscussionFilter;
  selectedGenre: string;
}) {
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <section className={cardClass("relative z-[60] overflow-visible p-2")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label
          htmlFor="community-discussion-search"
          className="block w-full min-w-0 sm:w-64 lg:w-72 xl:w-80"
        >
          <span className="sr-only">Search community discussions</span>
          <div className="relative">
            <input
              id="community-discussion-search"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search Discussions"
              className="min-h-10 w-full rounded-full border border-slate-700 bg-black/35 px-4 pr-11 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400/70"
            />
            {hasSearchQuery ? (
              <button
                type="button"
                aria-label="Clear discussion search"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-black text-slate-300 transition hover:border-yellow-400/60 hover:bg-yellow-400/10 hover:text-yellow-300"
              >
                X
              </button>
            ) : null}
          </div>
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <FilterMenu
            onSelect={onGenreChange}
            options={genreFilters}
            selectedOption={selectedGenre}
          />
          <FilterMenu
            onSelect={(filter) => onFilterChange(filter as DiscussionFilter)}
            options={[...discussionFilterOptions]}
            selectedOption={selectedFilter}
          />
          <button
            type="button"
            onClick={onStartDiscussion}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-yellow-400 px-4 text-xs font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:px-5"
          >
            + Start Discussion
          </button>
        </div>
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
          alt={`${discussion.movieTitle} discussion movie poster`}
          fallbackMovieId={discussion.movieId}
          href={communityMovieHref(discussion.movieId, discussion.movieTitle)}
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
              href={communityDiscussionHref(discussion.id, discussion.title)}
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 sm:px-4 sm:py-2 sm:text-sm"
            >
              Join Discussion
            </Link>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Avatar label={discussion.startedByAvatarUrl} size="sm" />
            <p className="min-w-0 truncate text-xs font-bold text-slate-300 sm:text-sm">
              Started by{" "}
              {discussion.startedByUsername ? (
                <ProfileUsernameLink
                  username={discussion.startedByUsername}
                  className="font-black text-white"
                >
                  {discussion.startedByDisplayName}
                </ProfileUsernameLink>
              ) : (
                <span className="font-black text-white">
                  {discussion.startedByDisplayName}
                </span>
              )}
              {discussion.startedByUsername ? (
                <span className="text-slate-500">
                  {" "}
                  <ProfileUsernameLink
                    username={discussion.startedByUsername}
                    className="text-slate-500"
                  >
                    @{discussion.startedByUsername}
                  </ProfileUsernameLink>
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
  const [discussionSearchQuery, setDiscussionSearchQuery] = useState("");
  const visibleDiscussions = useMemo(
    () => getVisibleDiscussions(discussions, selectedFilter, selectedGenre),
    [discussions, selectedFilter, selectedGenre]
  );
  const searchedDiscussions = useMemo(
    () =>
      visibleDiscussions.filter((discussion) =>
        discussionMatchesSearch(discussion, discussionSearchQuery)
      ),
    [discussionSearchQuery, visibleDiscussions]
  );

  return (
    <div className="space-y-3 sm:space-y-5">
      <DiscussionFilters
        onFilterChange={setSelectedFilter}
        onGenreChange={setSelectedGenre}
        onSearchChange={setDiscussionSearchQuery}
        onStartDiscussion={onStartDiscussion}
        searchQuery={discussionSearchQuery}
        selectedFilter={selectedFilter}
        selectedGenre={selectedGenre}
      />

      <div className="space-y-3 sm:space-y-4">
        {searchedDiscussions.length > 0 ? (
          searchedDiscussions.map((discussion) => (
            <DiscussionCard key={discussion.id} discussion={discussion} />
          ))
        ) : (
          <section className={cardClass("p-6 text-sm font-bold text-slate-300")}>
            {discussionSearchQuery.trim()
              ? "No discussions match that search yet."
              : "No discussions match those filters yet."}
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
        {trendingDiscussions.length > 0 ? (
          trendingDiscussions.map((discussion) => (
            <div
              key={discussion.id}
              className="grid grid-cols-[82px_1fr] items-center gap-3 border-b border-white/10 pb-4 last:border-b-0 last:pb-0"
            >
              <MovieThumb
                alt={`${discussion.movieTitle} movie discussion poster`}
                fallbackMovieId={discussion.movieId}
                fit="contain"
                href={communityDiscussionHref(discussion.id, discussion.title)}
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
          ))
        ) : (
          <p className="text-sm font-bold text-slate-400">
            No user discussions yet.
          </p>
        )}
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
                <p className="font-black text-white">
                  <ProfileUsernameLink username={user.username}>
                    {user.displayName}
                  </ProfileUsernameLink>
                </p>
                <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
                  <ProfileUsernameLink
                    username={user.username}
                    className="text-slate-500"
                  >
                    @{user.username}
                  </ProfileUsernameLink>
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
            <p className="truncate font-black text-white">
              <ProfileUsernameLink username={reviewer.username}>
                {reviewer.username}
              </ProfileUsernameLink>
            </p>
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
              <ProfileUsernameLink
                username={activity.username}
                className="font-black text-white"
              >
                @{activity.username}
              </ProfileUsernameLink>{" "}
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
              href={communityDiscussionHref(
                activity.discussionId,
                activity.discussionTitle
              )}
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
              <ProfileUsernameLink
                username={activity.username}
                className="font-black text-white"
              >
                @{activity.username}
              </ProfileUsernameLink>{" "}
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
                href={communityDiscussionHref(
                  activity.discussionId,
                  activity.discussionTitle
                )}
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
          alt={`${activity.movieTitle} movie poster`}
          fallbackMovieId={activity.movieId}
          href={communityMovieHref(activity.movieId, activity.movieTitle)}
          imagePath={activity.moviePoster}
          wide
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Avatar label={activity.avatar} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-5 text-slate-300">
                <ProfileUsernameLink
                  username={activity.username}
                  className="font-black text-white"
                >
                  @{activity.username}
                </ProfileUsernameLink>{" "}
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
            <ProfileUsernameLink username={user.username}>
              {user.displayName}
            </ProfileUsernameLink>
          </h3>
          <p className="mt-0.5 truncate text-xs font-bold text-slate-500 sm:text-sm">
            <ProfileUsernameLink
              username={user.username}
              className="text-slate-500"
            >
              @{user.username}
            </ProfileUsernameLink>
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
  const [isUserSearchFocused, setIsUserSearchFocused] = useState(false);
  const followingIds = useFollowingIds();
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const followingSet = useMemo(() => new Set(followingIds), [followingIds]);
  const userSuggestions = useMemo(() => {
    if (normalizedUserSearch.length < 2) {
      return [];
    }

    return users
      .filter((user) => {
        if (followingSet.has(user.userId)) {
          return false;
        }

        return (
          user.displayName.toLowerCase().includes(normalizedUserSearch) ||
          user.username.toLowerCase().includes(normalizedUserSearch)
        );
      })
      .slice(0, 6);
  }, [followingSet, normalizedUserSearch, users]);
  const visibleUsers = useMemo(() => {
    return users.filter((user) => {
      if (followingSet.has(user.userId)) {
        return false;
      }

      const matchesSearch =
        !normalizedUserSearch ||
        user.displayName.toLowerCase().includes(normalizedUserSearch) ||
        user.username.toLowerCase().includes(normalizedUserSearch);
      const matchesGenre =
        selectedFavoriteGenre === "All Genres" ||
        user.favoriteGenre === selectedFavoriteGenre;

      return matchesSearch && matchesGenre;
    });
  }, [followingSet, normalizedUserSearch, selectedFavoriteGenre, users]);

  const shouldShowUserSuggestions =
    isUserSearchFocused && normalizedUserSearch.length >= 2;

  return (
    <div className="w-full space-y-3 sm:space-y-5">
      <section className={cardClass("relative z-[60] overflow-visible p-2 sm:p-3")}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <label className="flex min-h-9 items-center rounded-full border border-slate-800 bg-black/35 px-3 text-xs font-bold text-slate-400 shadow-inner shadow-black/20 focus-within:border-yellow-400/70 sm:min-h-10 sm:text-sm">
              <span className="sr-only">Search users</span>
              <input
                value={userSearch}
                onBlur={() => {
                  window.setTimeout(() => setIsUserSearchFocused(false), 120);
                }}
                onChange={(event) => setUserSearch(event.target.value)}
                onFocus={() => setIsUserSearchFocused(true)}
                className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
                placeholder="Search users..."
                type="search"
              />
            </label>

            {shouldShowUserSuggestions ? (
              <div className="absolute left-0 right-0 z-[95] mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-black/60">
                {userSuggestions.length > 0 ? (
                  userSuggestions.map((user) => (
                    <button
                      key={user.userId}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setUserSearch(user.username);
                        setIsUserSearchFocused(false);
                      }}
                      className="grid w-full grid-cols-[40px_1fr] items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-black"
                    >
                      <Avatar label={user.avatar} size="md" />
                      <span className="min-w-0">
                        <span className="block truncate font-black">
                          {user.displayName}
                        </span>
                        <span className="block truncate text-xs opacity-75">
                          @{user.username}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-3 text-sm font-bold text-slate-500">
                    No users found.
                  </p>
                )}
              </div>
            ) : null}
          </div>
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

export default function CommunityClient({
  initialCommunityData,
}: {
  initialCommunityData: CommunityOverview;
}) {
  const { profile: currentProfile, user: currentUser } = usePopFile();
  const [selectedTab, setSelectedTab] = useState<CommunityTab>("Feed");
  const [selectedGenre, setSelectedGenre] = useState("All Genres");
  const [selectedTrend, setSelectedTrend] = useState("Trending");
  const [feedSearchQuery, setFeedSearchQuery] = useState("");
  const [isDiscussionDialogOpen, setIsDiscussionDialogOpen] = useState(false);
  const [createdDiscussions, setCreatedDiscussions] = useState<
    CommunityDiscussion[]
  >([]);
  const [communityData, setCommunityData] = useState(initialCommunityData);
  const communityRatings = communityData.ratings;
  const discoverableUsers = communityData.users;
  const topReviewers = communityData.reviewers;
  const currentUserId = currentProfile?.user_id ?? currentUser?.id ?? null;
  const [focusedPostId, setFocusedPostId] = useState<string | null>(null);
  const [feedActivityRefreshKey, setFeedActivityRefreshKey] = useState(0);
  const [feedActivitySummaries, setFeedActivitySummaries] = useState<
    Record<string, CommunityPostActivitySummary>
  >({});
  const communityDiscussions = useMemo(
    () => mergeCommunityDiscussions(createdDiscussions),
    [createdDiscussions]
  );
  const realFeedPosts = useMemo(
    () => communityRatings.map(mapCommunityRatingToPost),
    [communityRatings]
  );
  const feedPostsToShow = realFeedPosts;
  const feedActivityInputs = useMemo(
    () =>
      feedPostsToShow.map((post) => ({
        createdAt: post.createdAt,
        initialCommentCount: post.commentCount,
        initialLikeCount: post.likeCount,
        postId: post.id,
      })),
    [feedPostsToShow]
  );
  const feedPostsWithActivity = useMemo(
    () => applyFeedActivitySummaries(feedPostsToShow, feedActivitySummaries),
    [feedActivitySummaries, feedPostsToShow]
  );
  const visibleFeedPosts = useMemo(
    () => getVisibleFeedPosts(feedPostsWithActivity, selectedGenre, selectedTrend),
    [feedPostsWithActivity, selectedGenre, selectedTrend]
  );
  const searchedFeedPosts = useMemo(
    () =>
      visibleFeedPosts.filter((post) =>
        feedPostMatchesMovieSearch(post, feedSearchQuery)
      ),
    [feedSearchQuery, visibleFeedPosts]
  );
  const visibleDiscoverableUsers = useMemo(
    () => discoverableUsers.filter((user) => user.userId !== currentUserId),
    [currentUserId, discoverableUsers]
  );
  const mentionableUsers = useMemo(
    () => mergeMentionableUsers(visibleDiscoverableUsers),
    [visibleDiscoverableUsers]
  );
  const sidebarDiscussions = communityDiscussions;
  const showSocialSidebar =
    selectedTab === "Feed" || selectedTab === "Discussions";
  const showDiscussions = () => {
    setSelectedTab("Discussions");
    window.requestAnimationFrame(() => {
      window.scrollTo({ behavior: "smooth", top: 0 });
    });
  };

  useEffect(() => {
    const hasServerData =
      initialCommunityData.ratings.length > 0 &&
      initialCommunityData.users.length > 0;

    if (hasServerData) {
      return;
    }

    const controller = new AbortController();

    async function loadCommunityDataDirectly() {
      const [ratings, reviewers, users] = await Promise.all([
        getRecentCommunityRatings(30),
        getTopReviewers(150),
        getDiscoverableUsers(80),
      ]);

      if (!controller.signal.aborted) {
        setCommunityData({ ratings, reviewers, users });
      }
    }

    async function loadAuthenticatedCommunityData() {
      const accessToken = await getSupabaseAccessToken().catch(() => null);

      if (controller.signal.aborted) {
        return;
      }

      if (accessToken) {
        try {
          const response = await fetch("/api/community/overview", {
            cache: "no-store",
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          });

          if (response.ok) {
            const overview = (await response.json()) as CommunityOverview;
            const hasCommunityData =
              overview.ratings.length > 0 && overview.users.length > 0;

            if (hasCommunityData) {
              if (!controller.signal.aborted) {
                setCommunityData(overview);
              }
              return;
            }
          }
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }

          console.warn(
            "Consolidated Community request failed; using direct queries.",
            error
          );
        }
      }

      await loadCommunityDataDirectly();
    }

    loadAuthenticatedCommunityData().catch((error) => {
      if (!controller.signal.aborted) {
        console.error("Could not load Community data.", error);
      }
    });

    return () => controller.abort();
  }, [initialCommunityData]);

  useEffect(() => {
    const readFocusedPost = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const queryPostId = searchParams.get("postId");
      const hashFocusedPostId = window.location.hash.startsWith("#post-")
        ? window.location.hash.replace("#post-", "")
        : null;
      const nextFocusedPostId = queryPostId ?? hashFocusedPostId;

      if (nextFocusedPostId) {
        setFocusedPostId(nextFocusedPostId);
        setSelectedTab("Feed");
      }
    };

    readFocusedPost();
    window.addEventListener("hashchange", readFocusedPost);
    window.addEventListener("popstate", readFocusedPost);
    window.addEventListener(
      NOTIFICATION_TARGET_CHANGED_EVENT,
      readFocusedPost
    );

    return () => {
      window.removeEventListener("hashchange", readFocusedPost);
      window.removeEventListener("popstate", readFocusedPost);
      window.removeEventListener(
        NOTIFICATION_TARGET_CHANGED_EVENT,
        readFocusedPost
      );
    };
  }, []);

  useEffect(() => {
    if (!focusedPostId) {
      return;
    }

    const timeout = window.setTimeout(() => {
      document
        .getElementById(`post-${focusedPostId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [focusedPostId, visibleFeedPosts.length]);

  const saveCreatedDiscussions = (nextDiscussions: CommunityDiscussion[]) => {
    window.localStorage.setItem(
      communityDiscussionsStorageKey,
      JSON.stringify(nextDiscussions)
    );
    notifyCommunityDiscussionsUpdated();
  };

  const loadCreatedDiscussions = useCallback(() => {
    const localDiscussions = parseStoredCommunityDiscussions(
      window.localStorage.getItem(communityDiscussionsStorageKey)
    );

    setCreatedDiscussions(localDiscussions);

    void getCommunityDiscussions()
      .then((sharedDiscussions) => {
        setCreatedDiscussions(
          mergeCommunityDiscussions(sharedDiscussions, localDiscussions)
        );
      })
      .catch(() => {
        setCreatedDiscussions(localDiscussions);
      });
  }, []);

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
    void createCommunityDiscussion(discussion)
      .then((savedDiscussion) => {
        setCreatedDiscussions((currentDiscussions) => {
          const nextDiscussions = mergeCommunityDiscussions(
            [savedDiscussion],
            currentDiscussions
          );

          saveCreatedDiscussions(nextDiscussions);

          return nextDiscussions;
        });
        void checkAchievementEmails();
      })
      .catch(() => undefined);
    setIsDiscussionDialogOpen(false);
    setSelectedTab("Discussions");

    if (discussion.body) {
      void getCurrentNotificationActor().then((actor) =>
        notifyMentionedUsers({
          actor,
          body: discussion.body,
          entityId: communityDiscussionHref(discussion.id, discussion.title),
          entityType: "discussion",
          knownUsers: mentionableUsers,
          message: `${actor.displayName} mentioned you in a discussion.`,
        })
      );
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(loadCreatedDiscussions, 0);
    const refreshStoredDiscussions = (event: StorageEvent) => {
      if (event.key === communityDiscussionsStorageKey) {
        loadCreatedDiscussions();
      }
    };

    window.addEventListener("storage", refreshStoredDiscussions);
    window.addEventListener(
      COMMUNITY_DISCUSSIONS_UPDATED_EVENT,
      loadCreatedDiscussions
    );
    window.addEventListener("focus", loadCreatedDiscussions);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("storage", refreshStoredDiscussions);
      window.removeEventListener(
        COMMUNITY_DISCUSSIONS_UPDATED_EVENT,
        loadCreatedDiscussions
      );
      window.removeEventListener("focus", loadCreatedDiscussions);
    };
  }, [loadCreatedDiscussions]);

  useEffect(() => {
    const refreshFeedActivity = () => {
      setFeedActivityRefreshKey((currentKey) => currentKey + 1);
    };

    window.addEventListener(
      COMMUNITY_POST_ACTIVITY_UPDATED_EVENT,
      refreshFeedActivity
    );

    return () => {
      window.removeEventListener(
        COMMUNITY_POST_ACTIVITY_UPDATED_EVENT,
        refreshFeedActivity
      );
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    if (feedActivityInputs.length === 0) {
      return () => {
        isCurrent = false;
      };
    }

    getCommunityPostActivitySummaries(feedActivityInputs)
      .then((summaries) => {
        if (isCurrent) {
          setFeedActivitySummaries(summaries);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setFeedActivitySummaries({});
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [feedActivityInputs, feedActivityRefreshKey]);

  return (
    <main className="min-h-screen overflow-hidden bg-black bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,0.14),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_38%,#000_74%,#020617_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:radial-gradient(rgba(250,204,21,0.24)_1px,transparent_1px)] [background-size:42px_42px]" />
      <section className="relative mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
        <SiteHeader />

        <section className="py-7 sm:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black text-white sm:text-5xl">
                Join the PopScore Movie Community
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                The PopScore community lets movie fans share ratings, reviews,
                comments, and discussions. Follow other users, see what they are
                watching, and join conversations about movies.
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
                <CommunityFilters
                  onGenreChange={setSelectedGenre}
                  onSearchChange={setFeedSearchQuery}
                  onTrendChange={setSelectedTrend}
                  searchQuery={feedSearchQuery}
                  selectedGenre={selectedGenre}
                  selectedTrend={selectedTrend}
                />
                <FeedPostsList
                  currentUserId={currentUserId}
                  posts={searchedFeedPosts}
                  emptyMessage={
                    feedSearchQuery.trim()
                      ? "No movie comments match that search yet."
                      : "No posts match that filter yet."
                  }
                  mentionableUsers={mentionableUsers}
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
              <PeopleTabContent users={visibleDiscoverableUsers} />
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            {showSocialSidebar ? (
              <>
                <TrendingDiscussionsCard
                  discussions={sidebarDiscussions}
                  onSeeAll={showDiscussions}
                />
                <WhoToFollowCard users={visibleDiscoverableUsers} />
              </>
            ) : null}
            <TopReviewersCard
              isLoading={false}
              reviewers={topReviewers}
            />
          </aside>
        </section>
      </section>
      {isDiscussionDialogOpen ? (
        <StartDiscussionModal
          mentionableUsers={mentionableUsers}
          onClose={() => setIsDiscussionDialogOpen(false)}
          onPost={postDiscussion}
        />
      ) : null}
    </main>
  );
}
