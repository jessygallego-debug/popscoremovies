"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import EmojiIcon from "@/app/components/emoji-icon";
import FollowButton from "@/app/components/follow-button";
import MovieDnaSection, {
  MovieDnaSkeleton,
} from "@/app/components/movie-dna-section";
import MoviePosterImage from "@/app/components/movie-poster-image";
import ProfileUsernameLink, {
  profileStatsHref,
} from "@/app/components/profile-username-link";
import QuickReactionBadge from "@/app/components/quick-reaction-badge";
import ShareRatingButton from "@/app/components/share-rating-button";
import {
  FOLLOWS_UPDATED_EVENT,
  getFollowerUsers,
  getFollowSummary,
  getFollowingUsers,
  type FollowListUser,
  type FollowSummary,
} from "@/lib/follows";
import {
  getCommunityEngagementStatsForUser,
  type CommunityEngagementStats,
} from "@/lib/community-comments";
import {
  getCommunityDiscussionAchievementStatsForUser,
  type CommunityDiscussionAchievementStats,
} from "@/lib/community-discussions-store";
import {
  ACHIEVEMENTS,
  getAchievementProgress,
  getNextAchievement,
  type Achievement,
  type AchievementProgressSummary,
} from "@/lib/achievements";
import {
  avatarForKey,
  genreLabelForKey,
} from "@/lib/profile-config";
import {
  getAllUserRatingCounts,
  getProfileByUsername,
  getUserRatings,
  ProfileRecord,
  UserMovieRating,
  UserRatingCount,
} from "@/lib/profile-store";
import { POPSCORE_RATINGS_UPDATED_EVENT } from "@/lib/popscore-store";
import {
  getCurrentRatingStreak,
  getLongestRatingStreak,
} from "@/lib/rating-streaks";
import { posterUrl } from "@/lib/tmdb";
import styles from "@/app/components/profile-tabs.module.css";

type TabKey =
  | "stats"
  | "ratings"
  | "reviews"
  | "achievements"
  | "activity";

type FollowListMode = "followers" | "following";

type ProfileStatSummary = AchievementProgressSummary & {
  average: number;
  currentRatingStreakDays: number;
  highestGenre: string;
  lowestGenre: string;
  mostRatedGenre: string;
  totalMovieReactions: number;
};

type ProfileCommunityAchievementStats = CommunityEngagementStats &
  CommunityDiscussionAchievementStats;

type ProfileActivityStats = ProfileCommunityAchievementStats & {
  followerCount: number;
  followingCount: number;
};

type AchievementBadgeVisual = {
  border: string;
  glow: string;
  surface: string;
  text: string;
};

type PopScoreTier = {
  accent: string;
  description: string;
  icon: string;
  id: string;
  minRatings: number;
  name: string;
  requirementLabel: string;
  topPercentile?: number;
};

const EMPTY_PROFILE_COMMUNITY_STATS: ProfileCommunityAchievementStats = {
  communityCommentCount: 0,
  discussionCount: 0,
  discussionReplyCount: 0,
  maxDiscussionReplyCount: 0,
  receivedLikeCount: 0,
};

const EMPTY_PROFILE_ACTIVITY_STATS: ProfileActivityStats = {
  ...EMPTY_PROFILE_COMMUNITY_STATS,
  followerCount: 0,
  followingCount: 0,
};

const POPSCORE_TIERS: PopScoreTier[] = [
  {
    id: "new_rater",
    name: "New Rater",
    minRatings: 0,
    requirementLabel: "0+",
    icon: "🍿",
    accent: "#9ca3af",
    description: "You just joined the show.",
  },
  {
    id: "popcorn_rookie",
    name: "Popcorn Rookie",
    minRatings: 5,
    requirementLabel: "5+",
    icon: "🍿",
    accent: "#22c55e",
    description: "You're starting to build your movie taste.",
  },
  {
    id: "movie_buff",
    name: "Movie Buff",
    minRatings: 50,
    requirementLabel: "50+",
    icon: "🍿",
    accent: "#3b82f6",
    description: "You've rated more than half of PopScore users.",
  },
  {
    id: "theater_regular",
    name: "Theater Regular",
    minRatings: 75,
    requirementLabel: "75+",
    icon: "🍿",
    accent: "#a855f7",
    description: "You're becoming a serious PopScore rater.",
  },
  {
    id: "popscore_pro",
    name: "PopScore Pro",
    minRatings: 100,
    requirementLabel: "100+",
    icon: "★",
    accent: "#facc15",
    description: "Your ratings are shaping PopScore.",
  },
  {
    id: "elite_critic",
    name: "Elite Critic",
    minRatings: 200,
    requirementLabel: "200+",
    icon: "🎬",
    accent: "#fb923c",
    description: "You're one of the most active movie raters.",
  },
  {
    id: "buttery_legend",
    name: "Buttery Legend",
    minRatings: 500,
    requirementLabel: "500+",
    icon: "♛",
    accent: "#ef4444",
    description: "PopScore royalty.",
  },
];

const ACHIEVEMENT_BADGE_VISUALS: Record<
  Achievement["color"],
  AchievementBadgeVisual
> = {
  black: {
    border: "#94a3b8",
    glow: "rgba(148,163,184,0.28)",
    surface: "linear-gradient(145deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))",
    text: "#e5e7eb",
  },
  blue: {
    border: "#60a5fa",
    glow: "rgba(59,130,246,0.38)",
    surface: "linear-gradient(145deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))",
    text: "#bfdbfe",
  },
  butter: {
    border: "#fef08a",
    glow: "rgba(250,204,21,0.62)",
    surface: "linear-gradient(145deg,rgba(69,26,3,0.9),rgba(2,6,23,0.98))",
    text: "#fef08a",
  },
  gold: {
    border: "#fde68a",
    glow: "rgba(250,204,21,0.42)",
    surface: "linear-gradient(145deg,rgba(30,41,59,0.96),rgba(2,6,23,0.98))",
    text: "#fde047",
  },
  grayRed: {
    border: "#fca5a5",
    glow: "rgba(239,68,68,0.32)",
    surface: "linear-gradient(145deg,rgba(30,41,59,0.96),rgba(2,6,23,0.98))",
    text: "#fecaca",
  },
  green: {
    border: "#bef264",
    glow: "rgba(132,204,22,0.38)",
    surface: "linear-gradient(145deg,rgba(20,83,45,0.76),rgba(2,6,23,0.98))",
    text: "#bef264",
  },
  orange: {
    border: "#fed7aa",
    glow: "rgba(249,115,22,0.42)",
    surface: "linear-gradient(145deg,rgba(124,45,18,0.82),rgba(2,6,23,0.98))",
    text: "#fdba74",
  },
  purple: {
    border: "#d8b4fe",
    glow: "rgba(168,85,247,0.42)",
    surface: "linear-gradient(145deg,rgba(88,28,135,0.78),rgba(2,6,23,0.98))",
    text: "#d8b4fe",
  },
  silver: {
    border: "#e2e8f0",
    glow: "rgba(226,232,240,0.28)",
    surface: "linear-gradient(145deg,rgba(51,65,85,0.86),rgba(2,6,23,0.98))",
    text: "#e2e8f0",
  },
  teal: {
    border: "#99f6e4",
    glow: "rgba(20,184,166,0.38)",
    surface: "linear-gradient(145deg,rgba(19,78,74,0.82),rgba(2,6,23,0.98))",
    text: "#99f6e4",
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function hasPopScoreRating(rating: UserMovieRating) {
  return rating.weights.length > 0 && Object.keys(rating.ratings).length > 0;
}

function localDateKey(date: string) {
  const nextDate = new Date(date);
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRatingGenres(rating: UserMovieRating) {
  const genres = rating.genreNames.length > 0 ? rating.genreNames : [rating.genre];

  return genres
    .map((genre) => genreLabelForKey(genre))
    .filter(Boolean)
    .map((genre) => genre.trim());
}

function getPrimaryRatingGenre(rating: UserMovieRating) {
  return genreLabelForKey(rating.genreNames[0] ?? rating.genre);
}

function getMaxRatingDaysInMonth(ratings: UserMovieRating[]) {
  const daysByMonth = new Map<string, Set<string>>();

  ratings.forEach((rating) => {
    const dateKey = localDateKey(rating.created_at);
    const monthKey = dateKey.slice(0, 7);
    const days = daysByMonth.get(monthKey) ?? new Set<string>();

    days.add(dateKey);
    daysByMonth.set(monthKey, days);
  });

  return Math.max(0, ...Array.from(daysByMonth.values()).map((days) => days.size));
}

function getProfileStatSummary(
  ratings: UserMovieRating[],
  activityStats: ProfileActivityStats = EMPTY_PROFILE_ACTIVITY_STATS
): ProfileStatSummary {
  const popScoreRatings = ratings.filter(hasPopScoreRating);
  const average =
    popScoreRatings.length > 0
      ? Math.round(
          popScoreRatings.reduce(
            (total, rating) => total + rating.popscore,
            0
          ) / popScoreRatings.length
        )
      : 0;
  const genreTotals = new Map<string, { count: number; total: number }>();
  const genreCounts = new Map<string, number>();

  popScoreRatings.forEach((rating) => {
    const primaryGenre = rating.genreNames[0] ?? genreLabelForKey(rating.genre);
    const current = genreTotals.get(primaryGenre) ?? { count: 0, total: 0 };
    genreTotals.set(primaryGenre, {
      count: current.count + 1,
      total: current.total + rating.popscore,
    });

    getRatingGenres(rating).forEach((genre) => {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    });
  });

  const genreStats = Array.from(genreTotals.entries()).map(([genre, stats]) => ({
    average: Math.round(stats.total / stats.count),
    count: stats.count,
    genre,
  }));
  const mostRated = [...genreStats].sort((a, b) => b.count - a.count)[0];
  const highest = [...genreStats].sort((a, b) => b.average - a.average)[0];
  const lowest = [...genreStats].sort((a, b) => a.average - b.average)[0];
  const weekAgo = Date.now() - 7 * DAY_MS;
  const reviewCommentCount = ratings.filter((rating) =>
    Boolean(rating.reviewComment?.trim())
  ).length;
  const movieMatchRatings = popScoreRatings.filter(
    (rating) => rating.ratingSource === "movie_match"
  );

  return {
    average,
    currentRatingStreakDays: getCurrentRatingStreak(popScoreRatings),
    discussionCount: activityStats.discussionCount,
    followerCount: activityStats.followerCount,
    followingCount: activityStats.followingCount,
    highestGenre: highest?.genre ?? "None",
    lowestGenre: lowest?.genre ?? "None",
    maxDiscussionReplyCount: activityStats.maxDiscussionReplyCount,
    maxRatingDaysInMonth: getMaxRatingDaysInMonth(popScoreRatings),
    maxRatingsInSingleGenre: Math.max(0, ...Array.from(genreCounts.values())),
    mostRatedGenre: mostRated?.genre ?? "None",
    movieMatchRating80PlusCount: movieMatchRatings.filter(
      (rating) => rating.popscore >= 80
    ).length,
    movieMatchRatingsCount: movieMatchRatings.length,
    quickReactionCount: ratings.filter((rating) => Boolean(rating.quick_reaction))
      .length,
    ratingStreakDays: getLongestRatingStreak(popScoreRatings),
    ratings90Plus: popScoreRatings.filter((rating) => rating.popscore >= 90).length,
    ratingsThisWeek: popScoreRatings.filter(
      (rating) => new Date(rating.created_at).getTime() >= weekAgo
    ).length,
    ratingsUnder50: popScoreRatings.filter((rating) => rating.popscore < 50).length,
    receivedLikeCount: activityStats.receivedLikeCount,
    reviewOrCommentCount:
      reviewCommentCount +
      activityStats.communityCommentCount +
      activityStats.discussionReplyCount,
    totalMovieReactions: ratings.filter(
      (rating) => !hasPopScoreRating(rating) && Boolean(rating.quick_reaction)
    ).length,
    totalMoviesRated: popScoreRatings.length,
    uniqueGenresRated: genreCounts.size,
  };
}

function getPercentileStatus({
  population,
  totalMoviesRated,
  userId,
}: {
  population: UserRatingCount[];
  totalMoviesRated: number;
  userId: string;
}) {
  const countsByUser = new Map(
    population.map((item) => [item.userId, item.ratingsCount])
  );
  countsByUser.set(userId, Math.max(countsByUser.get(userId) ?? 0, totalMoviesRated));

  const counts = Array.from(countsByUser.values());
  const totalRaters = Math.max(1, counts.length);

  if (totalMoviesRated === 0) {
    return { rank: totalRaters, topPercentile: 100, totalRaters };
  }

  const rank = counts.filter((count) => count > totalMoviesRated).length + 1;
  const topPercentile =
    totalRaters <= 1
      ? 1
      : Math.max(
          1,
          Math.min(
            100,
            Math.round(1 + ((rank - 1) / (totalRaters - 1)) * 99)
          )
        );

  return { rank, topPercentile, totalRaters };
}

function getCurrentTier(totalMoviesRated: number, topPercentile: number) {
  void topPercentile;

  return POPSCORE_TIERS.reduce((currentTier, tier) => {
    const qualifiesByRatings = totalMoviesRated >= tier.minRatings;

    return qualifiesByRatings ? tier : currentTier;
  }, POPSCORE_TIERS[0]);
}

function profilePanelClass(className = "") {
  return `${styles.panel} ${className}`;
}

function SidebarIcon({ name }: { name: "achievements" | "lists" | "overview" | "ratings" | "reviews" }) {
  const paths = {
    overview: <path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9.5 20v-6h5v6" />,
    ratings: <path d="M5 20V10m4 10V4m4 16v-7m4 7V7m4 13H3" />,
    reviews: <path d="M4 5h16v11H9l-5 4V5Zm4 4h8m-8 3h6" />,
    lists: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
    achievements: <path d="M8 4h8v5a4 4 0 0 1-8 0V4Zm4 9v4m-4 3h8M6 6H3v2a4 4 0 0 0 5 4m10-6h3v2a4 4 0 0 1-5 4" />,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function ProfileSidebar({
  activeTab,
  followSummary,
  onTabChange,
  onFollowChange,
  onOpenFollowList,
  profile,
}: {
  activeTab: TabKey;
  followSummary: FollowSummary | null;
  onTabChange: (tab: TabKey) => void;
  onFollowChange: (summary: FollowSummary) => void;
  onOpenFollowList: (mode: FollowListMode) => void;
  profile: ProfileRecord;
}) {
  const avatar = avatarForKey(profile.avatar_key);
  const navItems: { icon: "achievements" | "overview" | "ratings" | "reviews"; key: TabKey; label: string }[] = [
    { key: "stats", label: "Overview", icon: "overview" },
    { key: "ratings", label: "Ratings", icon: "ratings" },
    { key: "reviews", label: "Reviews", icon: "reviews" },
    { key: "achievements", label: "Achievements", icon: "achievements" },
  ];

  return (
    <aside className={profilePanelClass(`${styles.sidebar} w-full min-w-0 max-w-full overflow-hidden p-4 lg:sticky lg:top-5 lg:self-start lg:p-5 xl:flex xl:min-h-[calc(100vh-7.5rem)] xl:flex-col`)}>
      <div className="flex items-center gap-4 text-left lg:flex-col lg:text-center">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-yellow-400/60 bg-yellow-400/10 shadow-[0_0_30px_rgba(250,204,21,0.12)] lg:h-28 lg:w-28">
          <EmojiIcon emoji={avatar.icon} label={avatar.label} size={60} />
        </span>
        <div className="min-w-0 flex-1 lg:w-full">
          <h1 className="break-all text-xl font-black text-white lg:mt-4 lg:text-2xl">
            <ProfileUsernameLink username={profile.username}>@{profile.username}</ProfileUsernameLink>
          </h1>
          {profile.favorite_genre ? (
            <span className="mt-2 inline-flex rounded-full bg-[#ffd23f] px-3 py-1 text-xs font-black text-[#081020]">
              {genreLabelForKey(profile.favorite_genre)}
            </span>
          ) : null}
          <p className="mt-2 text-xs font-medium text-slate-400">Member since {formatDate(profile.created_at)}</p>
        </div>
      </div>
      <div className="mt-4 grid w-full grid-cols-2 divide-x divide-slate-700/70 border-y border-slate-700/45 py-3">
          <button
            type="button"
            onClick={() => onOpenFollowList("followers")}
            className="rounded-xl px-2 text-center transition duration-200 hover:bg-yellow-400/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
          >
            <p className="text-lg font-black text-white">
              {followSummary?.followersCount ?? 0}
            </p>
            <p className="text-[11px] font-bold text-slate-500">Followers</p>
          </button>
          <button
            type="button"
            onClick={() => onOpenFollowList("following")}
            className="rounded-xl px-2 text-center transition duration-200 hover:bg-yellow-400/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
          >
            <p className="text-lg font-black text-white">
              {followSummary?.followingCount ?? 0}
            </p>
            <p className="text-[11px] font-bold text-slate-500">Following</p>
          </button>
      </div>

      <nav aria-label="PopFile sections" className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1.5 lg:overflow-visible">
        {navItems.slice(0, 3).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onTabChange(item.key)}
            className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl border px-4 text-sm font-bold transition duration-200 lg:w-full ${
              activeTab === item.key
                ? "border-yellow-400/55 bg-gradient-to-r from-yellow-400/20 to-yellow-400/5 text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.1)]"
                : "border-transparent text-slate-300 hover:border-slate-700/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <SidebarIcon name={item.icon} />
            {item.label}
          </button>
        ))}
        <Link
          href="/watchlist"
          className="flex min-h-11 shrink-0 items-center gap-3 rounded-xl border border-transparent px-4 text-sm font-bold text-slate-300 transition duration-200 hover:border-slate-700/70 hover:bg-white/5 hover:text-white lg:w-full"
        >
          <SidebarIcon name="lists" />
          Lists
        </Link>
        {navItems.slice(3).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onTabChange(item.key)}
            className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl border px-4 text-sm font-bold transition duration-200 lg:w-full ${activeTab === item.key ? "border-yellow-400/55 bg-gradient-to-r from-yellow-400/20 to-yellow-400/5 text-yellow-300" : "border-transparent text-slate-300 hover:border-slate-700/70 hover:bg-white/5 hover:text-white"}`}
          >
            <SidebarIcon name={item.icon} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 lg:mt-6">
        {followSummary?.isOwnProfile ? (
          <Link
            href="/profile/edit"
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-600/80 bg-slate-950/45 px-4 text-sm font-black text-slate-100 transition duration-200 hover:-translate-y-0.5 hover:border-yellow-400 hover:text-yellow-300 motion-reduce:transform-none"
          >
            Edit PopFile
          </Link>
        ) : (
          <FollowButton
            className="w-full [&>button]:w-full"
            onFollowChange={onFollowChange}
            target={{
              displayName: profile.username,
              userId: profile.user_id,
              username: profile.username,
            }}
          />
        )}
      </div>
      <blockquote className="mt-auto hidden pt-24 text-lg font-medium leading-7 text-slate-300 xl:block">
        “Good movies<br />make life better.”
        <span className="mt-5 block h-1 w-12 rounded-full bg-yellow-400" />
      </blockquote>
    </aside>
  );
}

function TierBadge({
  isMuted = false,
  size = "large",
  tier,
}: {
  isMuted?: boolean;
  size?: "large" | "small";
  tier: PopScoreTier;
}) {
  const dimensions =
    size === "large"
      ? {
          icon: "text-3xl sm:text-4xl",
          outer: "h-20 w-20 sm:h-24 sm:w-24",
          shine: "top-3 h-2.5 sm:top-4 sm:h-3",
          stripe: "bottom-2.5 h-1.5 w-9 sm:bottom-3 sm:w-10",
        }
      : {
          icon: "text-lg sm:text-xl",
          outer: "h-10 w-10 sm:h-12 sm:w-12",
          shine: "top-2 h-2",
          stripe: "bottom-1.5 h-1 w-5 sm:w-6",
        };
  const mutedStyle = isMuted
    ? {
        background:
          "linear-gradient(145deg,rgba(15,23,42,0.86),rgba(2,6,23,0.98))",
        borderColor: "#475569",
        boxShadow: "0 10px 22px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
        filter: "grayscale(1)",
        opacity: 0.52,
      }
    : {
        background: `linear-gradient(145deg,${tier.accent}33 0%,rgba(15,23,42,0.96) 38%,rgba(2,6,23,0.98) 100%)`,
        borderColor: tier.accent,
        boxShadow: `0 0 22px ${tier.accent}55, 0 12px 26px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -14px 22px rgba(0,0,0,0.36)`,
      };

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-black shadow-lg transition duration-300 ${dimensions.outer}`}
      style={mutedStyle}
    >
      <span className="absolute inset-0 rounded-full bg-black/20" />
      <span className="absolute inset-1 rounded-full border border-white/5" />
      <span className={`absolute inset-x-5 ${dimensions.shine} rounded-full bg-white/20 blur-sm`} />
      <span className="absolute bottom-0 h-1/2 w-full bg-gradient-to-t from-black/35 to-transparent" />
      <span
        className={`relative z-10 leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] ${dimensions.icon}`}
        style={{
          color: isMuted ? "#94a3b8" : tier.accent,
        }}
      >
        {isMuted ? (
          <EmojiIcon emoji="🔒" label="Locked" size={22} />
        ) : tier.icon === "🍿" || tier.icon === "🎬" ? (
          <EmojiIcon emoji={tier.icon} label={tier.name} size={24} />
        ) : (
          tier.icon
        )}
      </span>
      <span
        className={`absolute ${dimensions.stripe} z-10 rounded-full border border-white/15`}
        style={{ backgroundColor: isMuted ? "#475569" : tier.accent }}
      />
    </span>
  );
}

function PopScoreStatusCard({
  percentile,
  summary,
  tier,
}: {
  percentile: ReturnType<typeof getPercentileStatus>;
  summary: ProfileStatSummary;
  tier: PopScoreTier;
}) {
  const currentTierIndex = POPSCORE_TIERS.findIndex((item) => item.id === tier.id);
  const nextTier = POPSCORE_TIERS[currentTierIndex + 1];
  const progressTarget = nextTier?.minRatings ?? Math.max(summary.totalMoviesRated, 1);
  const progressPercent = nextTier
    ? Math.min(100, Math.round((summary.totalMoviesRated / progressTarget) * 100))
    : 100;
  const ratingsRemaining = nextTier
    ? Math.max(0, progressTarget - summary.totalMoviesRated)
    : 0;
  return (
    <section className={profilePanelClass(`${styles.statusHero} relative overflow-hidden p-4 sm:p-6`)}>
      <span className={styles.filmReel} aria-hidden="true" />
      <span className="absolute right-4 top-4 z-10 rounded-full border border-slate-600/60 bg-slate-950/60 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm sm:right-6 sm:top-5">
        All-time
      </span>

      <div className="relative z-10 grid gap-4 pr-16 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center sm:gap-6 sm:pr-24">
        <TierBadge tier={tier} />
        <div className="min-w-0">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-300">Your PopScore Status</h2>
          <h3 className="mt-1 text-3xl font-black leading-none sm:text-5xl" style={{ color: "#ffd23f" }}>
            {tier.name}
          </h3>
          <p className="mt-3 text-sm font-medium text-slate-200 sm:text-base">
            You&apos;re in the top <span className="font-black text-white">{percentile.topPercentile}%</span> of all PopScore raters.
          </p>
          <p className="mt-1 text-xs text-slate-400">{tier.description}</p>
        </div>
      </div>

      <div className="relative z-10 mt-5 grid grid-cols-2 gap-y-4 border-y border-slate-700/45 py-4 sm:grid-cols-4">
        {[
          ["Movies Rated", summary.totalMoviesRated],
          ["Rating Percentile", `Top ${percentile.topPercentile}%`],
          ["Overall Rank", `#${percentile.rank}`],
          ["Current Streak", `${summary.currentRatingStreakDays} ${summary.currentRatingStreakDays === 1 ? "day" : "days"}`],
        ].map(([label, value], index) => (
          <div key={label} className={`min-w-0 px-3 first:pl-0 sm:px-5 ${index > 0 ? "sm:border-l sm:border-slate-700/55" : ""}`}>
            <p className="break-words text-xl font-black text-white sm:text-2xl">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-200">
            {nextTier
              ? `${ratingsRemaining} more ${ratingsRemaining === 1 ? "rating" : "ratings"} until ${nextTier.name}`
              : "Top tier reached"}
          </p>
          <p className="text-xs font-bold text-slate-300 sm:text-sm">
            {nextTier
              ? `${summary.totalMoviesRated} / ${progressTarget}`
              : "You reached the highest tier"}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full border border-white/5 bg-slate-800/90 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-pink-500 to-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.45)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 -mx-1 mt-5 flex gap-3 overflow-x-auto px-1 pb-2 sm:justify-between sm:gap-2">
        {POPSCORE_TIERS.map((item, index) => (
          <div key={item.id} className="flex w-[82px] shrink-0 flex-col items-center text-center sm:w-auto sm:min-w-0 sm:flex-1">
            <TierBadge
              tier={item}
              size="small"
              isMuted={index > currentTierIndex}
            />
            <p
              className="mt-2 text-[10px] font-black leading-tight sm:text-xs"
              style={{ color: index <= currentTierIndex ? item.accent : "#94a3b8" }}
            >
              {item.name}
            </p>
            <p className="mt-1 text-[10px] font-bold text-slate-500 sm:text-[11px]">
              {item.requirementLabel}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ButteryFanIcon({ isUnlocked }: { isUnlocked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block h-full w-full ${isUnlocked ? "" : "grayscale opacity-[0.65]"}`}
    >
      {isUnlocked ? (
        <>
          <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-yellow-100 shadow-[0_0_10px_rgba(254,240,138,0.95)]" />
          <span className="absolute right-1 top-2 h-1 w-1 rounded-full bg-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.95)]" />
          <span className="absolute bottom-2 left-2 h-1 w-1 rounded-full bg-yellow-200 shadow-[0_0_8px_rgba(250,204,21,0.95)]" />
        </>
      ) : null}
      <Image
        alt=""
        className="object-contain drop-shadow-[0_0_14px_rgba(250,204,21,0.45)]"
        fill
        sizes="96px"
        src="/rating-icons/extra-buttery-v2.png"
        unoptimized
      />
    </span>
  );
}

function AchievementBadge({
  achievement,
  compact = false,
  showCaption = true,
  size,
  summary,
}: {
  achievement: Achievement;
  compact?: boolean;
  showCaption?: boolean;
  size?: "small" | "medium" | "large";
  summary: ProfileStatSummary;
}) {
  const progress = getAchievementProgress(achievement, summary);
  const visual = ACHIEVEMENT_BADGE_VISUALS[achievement.color];
  const isUnlocked = progress.isUnlocked;
  const resolvedSize = size ?? (compact ? "small" : "medium");
  const dimensions = {
    large: {
      badgeText: "bottom-2 text-xs",
      icon: "text-3xl sm:text-4xl",
      image: "h-14 w-14 sm:h-16 sm:w-16",
      outer: "h-20 w-20 sm:h-24 sm:w-24",
      shine: "top-4 h-3",
    },
    medium: {
      badgeText: "bottom-2 text-[11px]",
      icon: "text-2xl sm:text-3xl",
      image: "h-12 w-12 sm:h-14 sm:w-14",
      outer: "h-16 w-16 sm:h-20 sm:w-20",
      shine: "top-3 h-2.5",
    },
    small: {
      badgeText: "bottom-1.5 text-[10px]",
      icon: "text-xl sm:text-2xl",
      image: "h-10 w-10 sm:h-12 sm:w-12",
      outer: "h-14 w-14 sm:h-[68px] sm:w-[68px]",
      shine: "top-2.5 h-2",
    },
  }[resolvedSize];
  const lockedSurface =
    "linear-gradient(145deg,rgba(15,23,42,0.86),rgba(2,6,23,0.98))";
  const isButteryFan = achievement.id === "buttery_fan";
  const displayIcon = isUnlocked ? achievement.icon : "🔒";
  const progressLabel = progress.isUnlocked ? "Unlocked" : progress.text;

  return (
    <div className="group relative flex flex-col items-center text-center">
      {isUnlocked ? (
        <span
          aria-hidden="true"
          className={`${dimensions.outer} absolute rounded-full blur-xl transition duration-300 group-hover:opacity-95`}
          style={{ background: visual.glow, opacity: 0.68 }}
        />
      ) : null}
      <span
        aria-label={`${achievement.name}: ${progress.text}`}
        className={`${dimensions.outer} relative flex items-center justify-center overflow-hidden rounded-full border font-black shadow-lg transition duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03]`}
        style={{
          background: isUnlocked ? visual.surface : lockedSurface,
          borderColor: isUnlocked ? visual.border : "#475569",
          boxShadow: isUnlocked
            ? `0 0 22px ${visual.glow}, 0 12px 26px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -14px 22px rgba(0,0,0,0.36)`
            : "0 10px 22px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
          color: isUnlocked ? visual.text : "#94a3b8",
          filter: isUnlocked ? "none" : "grayscale(1)",
          opacity: isUnlocked ? 1 : 0.52,
        }}
      >
        <span className="absolute inset-0 rounded-full bg-black/20" />
        <span className="absolute inset-1 rounded-full border border-white/5" />
        <span className={`absolute inset-x-5 ${dimensions.shine} rounded-full bg-white/20 blur-sm transition group-hover:bg-white/30`} />
        <span className="absolute bottom-0 h-1/2 w-full bg-gradient-to-t from-black/35 to-transparent" />
        <span className="relative z-10 flex items-center justify-center leading-none">
          {isButteryFan ? (
            <span className={`relative block ${dimensions.image}`}>
              <ButteryFanIcon isUnlocked={isUnlocked} />
            </span>
          ) : (
            <span className={`${dimensions.icon} relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]`}>
              <EmojiIcon
                emoji={displayIcon}
                label={isUnlocked ? achievement.name : "Locked"}
                size={resolvedSize === "large" ? 40 : resolvedSize === "medium" ? 34 : 28}
              />
            </span>
          )}
        </span>
        {achievement.badgeText ? (
          <span
            className={`absolute ${dimensions.badgeText} z-10 rounded-full border border-white/15 bg-black/70 px-2 py-0.5 font-black text-white shadow-[0_0_10px_rgba(0,0,0,0.35)]`}
          >
            {achievement.badgeText}
          </span>
        ) : null}
      </span>
      {showCaption ? (
        <>
          <p className="mt-2 line-clamp-1 text-[11px] font-black text-white sm:mt-3 sm:text-sm">
            {achievement.name}
          </p>
          <p className="mt-1 line-clamp-1 text-[10px] font-bold text-slate-500 sm:text-xs">
            {progressLabel}
          </p>
        </>
      ) : null}
      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 hidden w-56 -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-950 p-3 text-left shadow-2xl shadow-black/60 group-hover:block">
        <p className="font-black text-white">{achievement.name}</p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {achievement.description}
        </p>
        <p className="mt-2 text-xs font-black text-yellow-300">
          Progress: {progress.text}
        </p>
      </div>
    </div>
  );
}

function AchievementsCard({
  onViewAll,
  summary,
}: {
  onViewAll: () => void;
  summary: ProfileStatSummary;
}) {
  const featured = ACHIEVEMENTS.slice(0, 4);
  const nextAchievement = getNextAchievement(summary);

  return (
    <section className={profilePanelClass("p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-black text-white sm:text-xl">Achievements</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-black text-purple-300 transition hover:text-yellow-300 sm:text-sm"
        >
          View all
        </button>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:mt-6 sm:gap-3">
        {featured.map((achievement) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            compact
            summary={summary}
          />
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-black/35 p-3 sm:mt-6 sm:p-4">
        {nextAchievement ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-black text-white">Next Achievement</p>
              <p className="text-xs font-bold text-slate-400">
                {nextAchievement.progress.text}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-3 sm:gap-4">
              <AchievementBadge
                achievement={nextAchievement.achievement}
                compact
                showCaption={false}
                summary={summary}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white sm:text-base">
                  {nextAchievement.achievement.name}
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-400 sm:text-xs">
                  {nextAchievement.achievement.description}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-yellow-400"
                    style={{ width: `${nextAchievement.progress.percent}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-3 text-center">
            <p className="font-black text-yellow-300">All achievements unlocked</p>
            <p className="mt-1 text-sm font-bold text-slate-400">
              Your PopFile trophy shelf is full.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function RecentActivityCard({
  limit = 8,
  onViewAll,
  ratings,
  showAll = false,
}: {
  limit?: number;
  onViewAll?: () => void;
  ratings: UserMovieRating[];
  showAll?: boolean;
}) {
  const items = showAll ? ratings : ratings.slice(0, limit);

  return (
    <section className={profilePanelClass("p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-black text-white sm:text-xl">Recent Activity</h2>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-black text-purple-300 transition hover:text-yellow-300 sm:text-sm"
          >
            View all
          </button>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-3 divide-y divide-slate-800/80 sm:mt-4">
          {items.map((rating) => {
            const isFullRating = hasPopScoreRating(rating);

            return (
              <article
                key={rating.id}
                className="grid grid-cols-[52px_minmax(0,1fr)_auto] gap-3 py-3"
              >
                <MoviePoster
                  movieId={rating.movieId}
                  path={rating.posterPath}
                  title={rating.movieTitle}
                  size="small"
                />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-black leading-tight text-white">
                    {isFullRating ? "Rated" : "Reacted to"} {rating.movieTitle}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 text-[11px] font-black text-yellow-300">
                      {isFullRating ? `${rating.popscore}%` : "Reaction"}
                    </span>
                    {rating.quick_reaction ? (
                      <QuickReactionBadge reaction={rating.quick_reaction} />
                    ) : null}
                  </div>
                </div>
                <p className="pt-0.5 text-right text-[10px] font-medium text-slate-500">
                  {formatDate(rating.updated_at)}
                </p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-black/25 p-6 text-center">
          <p className="font-black text-white">No activity yet</p>
          <p className="mt-2 text-sm font-bold text-slate-400">
            Start rating movies to build your PopFile.
          </p>
        </div>
      )}
    </section>
  );
}

function RatingsHistory({ ratings }: { ratings: UserMovieRating[] }) {
  const [genreFilter, setGenreFilter] = useState("all");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "highest" | "lowest" | "title"
  >("newest");
  const genres = useMemo(
    () =>
      Array.from(
        new Set(
          ratings.map(getPrimaryRatingGenre)
        )
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [ratings]
  );
  const visibleRatings = useMemo(() => {
    const filtered =
      genreFilter === "all"
        ? ratings
        : ratings.filter(
            (rating) => getPrimaryRatingGenre(rating) === genreFilter
          );

    return [...filtered].sort((a, b) => {
      if (sortBy === "highest") {
        return b.popscore - a.popscore || a.movieTitle.localeCompare(b.movieTitle);
      }

      if (sortBy === "lowest") {
        return a.popscore - b.popscore || a.movieTitle.localeCompare(b.movieTitle);
      }

      if (sortBy === "title") {
        return a.movieTitle.localeCompare(b.movieTitle);
      }

      const dateDifference =
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return sortBy === "oldest" ? -dateDifference : dateDifference;
    });
  }, [genreFilter, ratings, sortBy]);

  if (ratings.length === 0) {
    return <EmptyState text="No ratings yet." />;
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-800 bg-black/25 p-3 sm:grid-cols-2 sm:p-4">
        <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
          Genre
          <select
            aria-label="Filter ratings by genre"
            value={genreFilter}
            onChange={(event) => setGenreFilter(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
          >
            <option value="all">All Genres</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
          Sort By
          <select
            aria-label="Sort ratings"
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as
                  | "newest"
                  | "oldest"
                  | "highest"
                  | "lowest"
                  | "title"
              )
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
          >
            <option value="newest">Newest Rated</option>
            <option value="oldest">Oldest Rated</option>
            <option value="highest">Highest PopScore</option>
            <option value="lowest">Lowest PopScore</option>
            <option value="title">Movie Title A–Z</option>
          </select>
        </label>
      </div>

      {visibleRatings.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {visibleRatings.map((rating) => (
            <article
              key={rating.id}
              className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/90 p-3 sm:gap-4 sm:p-4"
            >
              <MoviePoster
                movieId={rating.movieId}
                path={rating.posterPath}
                title={rating.movieTitle}
              />
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-sm font-black text-white sm:text-base">
                  {rating.movieTitle}
                </h3>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {getPrimaryRatingGenre(rating)}
                </p>
                <p className="mt-2 text-xl font-black text-yellow-400 sm:mt-3 sm:text-2xl">
                  {rating.popscore}%
                </p>
                <div className="mt-2">
                  {rating.quick_reaction ? (
                    <QuickReactionBadge reaction={rating.quick_reaction} />
                  ) : null}
                </div>
                <p className="mt-2 text-xs font-bold text-slate-500 sm:mt-3">
                  Rated {formatDate(rating.created_at)}
                </p>
                <div className="mt-3">
                  <ShareRatingButton
                    movieId={rating.movieId}
                    movieTitle={rating.movieTitle}
                    popscore={rating.popscore}
                    posterPath={rating.posterPath}
                    variant="compact"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-black/25 p-6 text-center">
          <p className="font-black text-white">No ratings in this genre.</p>
          <button
            type="button"
            onClick={() => setGenreFilter("all")}
            className="mt-3 text-sm font-black text-yellow-300 hover:text-yellow-200"
          >
            Show all ratings
          </button>
        </div>
      )}
    </div>
  );
}

function MomentumCard({ summary }: { summary: ProfileStatSummary }) {
  return (
    <section className={profilePanelClass("p-4 sm:p-5")}>
      <h2 className="text-lg font-black text-white sm:text-xl">PopFile Momentum</h2>
      <div className="mt-4 grid grid-cols-2 divide-x divide-slate-800">
        <div className="flex items-center gap-3 pr-4">
          <EmojiIcon emoji="🔥" label="Rating streak" size={28} />
          <div>
            <p className="text-3xl font-black text-yellow-300">{summary.ratingStreakDays}</p>
            <p className="mt-1 text-xs font-medium text-slate-400">Longest Streak</p>
          </div>
        </div>
        <div className="pl-4">
          <p className="text-3xl font-black text-purple-300">{summary.currentRatingStreakDays}</p>
          <p className="mt-1 text-xs font-medium text-slate-400">Current Streak</p>
        </div>
      </div>
    </section>
  );
}

function CinematicBanner({ className = "" }: { className?: string }) {
  return (
    <section className={`${styles.panel} ${styles.brandBanner} flex min-h-24 items-center justify-between gap-5 px-5 py-4 sm:px-7 ${className}`} aria-label="PopScore Movies">
      <p className="text-lg font-medium leading-7 text-purple-100 sm:text-2xl">
        <span aria-hidden="true" className="mr-2 text-3xl font-black text-purple-400">“</span>
        Different perspectives.<br />A better way to watch.
      </p>
      <div className="shrink-0 text-right">
        <p className="text-xl font-black tracking-tight text-white sm:text-3xl">POP<span className="text-yellow-400">SCORE</span></p>
        <p className="text-[8px] font-black uppercase tracking-[0.38em] text-slate-300 sm:text-[10px]">Movies</p>
      </div>
    </section>
  );
}

function ReviewsHistory({ ratings }: { ratings: UserMovieRating[] }) {
  const reviews = ratings.filter((rating) => rating.reviewComment?.trim());

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-black/25 p-6 text-center">
        <p className="font-black text-white">No written reviews yet</p>
        <p className="mt-2 text-sm font-bold text-slate-400">
          Add a comment when you rate a movie and it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {reviews.map((rating) => (
        <article key={rating.id} className="flex gap-3 rounded-2xl border border-slate-800 bg-black/25 p-3">
          <MoviePoster movieId={rating.movieId} path={rating.posterPath} size="small" title={rating.movieTitle} />
          <div className="min-w-0">
            <h3 className="line-clamp-1 font-black text-white">{rating.movieTitle}</h3>
            <p className="mt-1 text-sm font-black text-yellow-300">{rating.popscore}% PopScore</p>
            <p className="mt-2 line-clamp-4 text-sm font-bold leading-5 text-slate-300">
              “{rating.reviewComment}”
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function AllAchievements({ summary }: { summary: ProfileStatSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {ACHIEVEMENTS.map((achievement) => {
        const progress = getAchievementProgress(achievement, summary);

        return (
          <article
            key={achievement.id}
            className="rounded-2xl border border-slate-800 bg-slate-950/90 p-2.5 sm:p-5"
          >
            <div className="flex items-center gap-2 sm:gap-4">
              <AchievementBadge
                achievement={achievement}
                size="small"
                showCaption={false}
                summary={summary}
              />
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-xs font-black leading-tight text-white sm:text-base">{achievement.name}</h3>
                <p className="mt-1 line-clamp-2 text-[10px] font-bold leading-tight text-slate-400 sm:text-sm">
                  {achievement.description}
                </p>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800 sm:mt-4 sm:h-2">
              <div
                className="h-full rounded-full bg-yellow-400"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] font-black text-slate-400 sm:mt-2 sm:text-xs">
              {progress.isUnlocked ? "Unlocked" : progress.text}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className={profilePanelClass("p-4 sm:p-6")}>
      <h2 className="text-lg font-black text-white sm:text-xl">{title}</h2>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

function normalizeMoviePosterPath(path?: string | null) {
  const trimmedPath = path?.trim();

  if (
    !trimmedPath ||
    trimmedPath.toLowerCase() === "null" ||
    trimmedPath.toLowerCase() === "undefined"
  ) {
    return null;
  }

  return trimmedPath;
}

function MoviePoster({
  movieId,
  path,
  size = "default",
  title,
}: {
  movieId?: string | null;
  path?: string | null;
  size?: "default" | "small";
  title: string;
}) {
  const posterKey = `${movieId ?? ""}:${path ?? ""}`;
  const [posterRecovery, setPosterRecovery] = useState<{
    failedPosterPath: string | null;
    fallbackPath: string | null;
    key: string;
  }>({
    failedPosterPath: null,
    fallbackPath: null,
    key: posterKey,
  });
  const fallbackPath =
    posterRecovery.key === posterKey ? posterRecovery.fallbackPath : null;
  const failedPosterPath =
    posterRecovery.key === posterKey ? posterRecovery.failedPosterPath : null;
  const primaryPath = normalizeMoviePosterPath(path);
  const resolvedFallbackPath = normalizeMoviePosterPath(fallbackPath);
  const activePath = resolvedFallbackPath ?? primaryPath;
  const poster =
    activePath && activePath !== failedPosterPath ? posterUrl(activePath) : null;
  const dimensions = size === "small" ? "h-[78px] w-[52px]" : "h-28 w-20";
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    let isCurrent = true;

    if (!movieId || (primaryPath && failedPosterPath !== primaryPath)) {
      return () => {
        isCurrent = false;
      };
    }

    fetch(`/api/movie-poster?movie=${encodeURIComponent(movieId)}`)
      .then((response) => response.json())
      .then((data: { posterPath?: string | null }) => {
        const nextPath = normalizeMoviePosterPath(data.posterPath);

        if (isCurrent && nextPath && nextPath !== primaryPath) {
          setPosterRecovery((current) => ({
            failedPosterPath:
              current.key === posterKey ? current.failedPosterPath : null,
            fallbackPath: nextPath,
            key: posterKey,
          }));
        }
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, [failedPosterPath, movieId, posterKey, primaryPath]);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-slate-900 ${dimensions}`}
    >
      {poster ? (
        <MoviePosterImage
          src={poster}
          alt={`${title} movie poster`}
          sizes={size === "small" ? "52px" : "80px"}
          className="object-cover"
          onLoadError={() => {
            if (activePath) {
              setPosterRecovery((current) => ({
                failedPosterPath: activePath,
                fallbackPath:
                  current.key === posterKey ? current.fallbackPath : null,
                key: posterKey,
              }));
            }
          }}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black px-2 text-center">
          <span className="text-base font-black text-yellow-300">
            {initials || "PS"}
          </span>
          {size === "default" ? (
            <span className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              No Poster
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-6 font-bold text-slate-400">
      {text}
    </div>
  );
}

function FollowListDialog({
  error,
  isLoading,
  mode,
  onClose,
  users,
}: {
  error: string;
  isLoading: boolean;
  mode: FollowListMode;
  onClose: () => void;
  users: FollowListUser[];
}) {
  const title = mode === "followers" ? "Followers" : "Following";
  const emptyText =
    mode === "followers"
      ? "No followers yet."
      : "This user is not following anyone yet.";

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[150] flex items-start justify-center bg-black/75 px-4 py-16 backdrop-blur-sm sm:py-24"
      role="dialog"
    >
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/70">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 p-4 sm:p-5">
          <div>
            <h2 className="text-xl font-black text-white">{title}</h2>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {users.length} {users.length === 1 ? "user" : "users"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-lg font-black text-slate-300 transition hover:border-yellow-400 hover:text-yellow-300"
            aria-label="Close follow list"
          >
            ×
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 sm:p-4">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-800 bg-black/25 p-5 text-sm font-bold text-slate-300">
              Loading {title.toLowerCase()}...
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-sm font-bold text-red-100">
              {error}
            </div>
          ) : null}

          {!isLoading && !error && users.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-black/25 p-5 text-sm font-bold text-slate-300">
              {emptyText}
            </div>
          ) : null}

          {!isLoading && !error && users.length > 0 ? (
            <div className="grid gap-2">
              {users.map((user) => (
                <Link
                  key={user.userId}
                  href={profileStatsHref(user.username)}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-black/25 p-3 transition hover:border-yellow-400/45 hover:bg-yellow-400/10"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-yellow-400/35 bg-yellow-400/10 text-2xl">
                    <EmojiIcon emoji={user.avatar} size={28} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-white">
                      @{user.username}
                    </span>
                    <span className="mt-1 block truncate text-xs font-bold text-slate-400">
                      Favorite Genre: {user.favoriteGenre}
                    </span>
                  </span>
                  <span className="text-xs font-black text-yellow-300">
                    View
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default function ProfileTabs({ username }: { username: string }) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab: TabKey =
    requestedTab === "ratings" ||
    requestedTab === "reviews" ||
    requestedTab === "achievements" ||
    requestedTab === "activity"
      ? requestedTab
      : "stats";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [ratings, setRatings] = useState<UserMovieRating[]>([]);
  const [followSummary, setFollowSummary] = useState<FollowSummary | null>(
    null
  );
  const [followListMode, setFollowListMode] =
    useState<FollowListMode | null>(null);
  const [followListUsers, setFollowListUsers] = useState<FollowListUser[]>([]);
  const [followListError, setFollowListError] = useState("");
  const [isFollowListLoading, setIsFollowListLoading] = useState(false);
  const [profileCommunityStats, setProfileCommunityStats] =
    useState<ProfileCommunityAchievementStats>(
      EMPTY_PROFILE_COMMUNITY_STATS
    );
  const [ratingPopulation, setRatingPopulation] = useState<UserRatingCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    queueMicrotask(() => setActiveTab(initialTab));
  }, [initialTab]);

  useEffect(() => {
    let isCurrent = true;

    queueMicrotask(() => {
      if (isCurrent) {
        setIsLoading(true);
        setLoadError("");
      }
    });

    getProfileByUsername(username)
      .then((nextProfile) => {
        if (!isCurrent) {
          return;
        }

        setProfile(nextProfile);
        setFollowSummary(null);
        setFollowListMode(null);
        setFollowListUsers([]);
        setFollowListError("");
        setProfileCommunityStats(EMPTY_PROFILE_COMMUNITY_STATS);
        if (!nextProfile) {
          setIsLoading(false);
          return;
        }

        Promise.all([
          getUserRatings(nextProfile.user_id),
          getAllUserRatingCounts(),
        ])
          .then(([nextRatings, nextRatingPopulation]) => {
            if (!isCurrent) {
              return;
            }

            setRatings(nextRatings);
            setRatingPopulation(nextRatingPopulation);
            setIsLoading(false);

            void Promise.all([
              getCommunityEngagementStatsForUser({
                ratingIds: nextRatings.map((rating) => rating.id),
                userId: nextProfile.user_id,
              }),
              getCommunityDiscussionAchievementStatsForUser(nextProfile.user_id),
            ]).then(([nextEngagementStats, nextDiscussionStats]) => {
              if (!isCurrent) {
                return;
              }

              setProfileCommunityStats({
                ...nextEngagementStats,
                ...nextDiscussionStats,
              });
            });
          })
          .catch(() => {
            if (isCurrent) {
              setLoadError("Movie DNA and profile ratings could not be loaded. Please try again.");
              setIsLoading(false);
            }
          });
      })
      .catch(() => {
        if (isCurrent) {
          setLoadError("This PopFile could not be loaded. Please try again.");
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [username]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    let isCurrent = true;
    const target = {
      displayName: profile.username,
      userId: profile.user_id,
      username: profile.username,
    };
    const loadFollowSummary = () => {
      getFollowSummary(target).then((nextSummary) => {
        if (isCurrent) {
          setFollowSummary(nextSummary);
        }
      });
    };

    loadFollowSummary();
    window.addEventListener(FOLLOWS_UPDATED_EVENT, loadFollowSummary);

    return () => {
      isCurrent = false;
      window.removeEventListener(FOLLOWS_UPDATED_EVENT, loadFollowSummary);
    };
  }, [profile]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    let isCurrent = true;
    const refreshRatings = () => {
      void getUserRatings(profile.user_id)
        .then((nextRatings) => {
          if (isCurrent) {
            setRatings(nextRatings);
          }
        })
        .catch(() => null);
    };

    window.addEventListener(POPSCORE_RATINGS_UPDATED_EVENT, refreshRatings);
    return () => {
      isCurrent = false;
      window.removeEventListener(POPSCORE_RATINGS_UPDATED_EVENT, refreshRatings);
    };
  }, [profile]);

  const achievementActivityStats = useMemo<ProfileActivityStats>(
    () => ({
      ...profileCommunityStats,
      followerCount: followSummary?.followersCount ?? 0,
      followingCount: followSummary?.followingCount ?? 0,
    }),
    [followSummary, profileCommunityStats]
  );
  const summary = useMemo(
    () => getProfileStatSummary(ratings, achievementActivityStats),
    [achievementActivityStats, ratings]
  );
  const openFollowList = (mode: FollowListMode) => {
    if (!profile) {
      return;
    }

    setFollowListMode(mode);
    setFollowListUsers([]);
    setFollowListError("");
    setIsFollowListLoading(true);

    const loader =
      mode === "followers" ? getFollowerUsers : getFollowingUsers;

    loader(profile.user_id)
      .then((users) => setFollowListUsers(users))
      .catch(() => {
        setFollowListError("Could not load this list. Please try again.");
      })
      .finally(() => setIsFollowListLoading(false));
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <EmptyState text="Loading PopFile..." />
        <MovieDnaSkeleton />
      </div>
    );
  }

  if (loadError) {
    return <EmptyState text={loadError} />;
  }

  if (!profile) {
    return <EmptyState text="PopFile not found." />;
  }

  const percentile = getPercentileStatus({
    population: ratingPopulation,
    totalMoviesRated: summary.totalMoviesRated,
    userId: profile.user_id,
  });
  const currentTier = getCurrentTier(
    summary.totalMoviesRated,
    percentile.topPercentile
  );
  const fullRatings = ratings.filter(hasPopScoreRating);

  return (
    <div
      className={`grid gap-4 sm:gap-6 ${
        activeTab === "stats"
          ? "lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_320px] 2xl:grid-cols-[230px_minmax(0,1fr)_350px]"
          : "lg:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[230px_minmax(0,1fr)]"
      }`}
    >
      <ProfileSidebar
        activeTab={activeTab}
        followSummary={followSummary}
        onTabChange={setActiveTab}
        onFollowChange={setFollowSummary}
        onOpenFollowList={openFollowList}
        profile={profile}
      />

      <main className="min-w-0 space-y-4 sm:space-y-6">
        <PopScoreStatusCard
          percentile={percentile}
          summary={summary}
          tier={currentTier}
        />
        {activeTab === "stats" ? (
          <>
            <MovieDnaSection
              percentile={percentile.topPercentile}
              ratings={ratings}
              totalMoviesRated={summary.totalMoviesRated}
              username={profile.username}
            />
            <CinematicBanner className="hidden xl:flex" />
          </>
        ) : null}

        {activeTab === "achievements" ? (
          <SectionCard title="All Achievements">
            <AllAchievements summary={summary} />
          </SectionCard>
        ) : null}
        {activeTab === "ratings" ? (
          <SectionCard title="Ratings History">
            <RatingsHistory ratings={fullRatings} />
          </SectionCard>
        ) : null}
        {activeTab === "reviews" ? (
          <SectionCard title="Reviews">
            <ReviewsHistory ratings={fullRatings} />
          </SectionCard>
        ) : null}
        {activeTab === "activity" ? (
          <RecentActivityCard ratings={ratings} showAll />
        ) : null}
      </main>

      {activeTab === "stats" ? (
        <aside className="space-y-4 sm:space-y-6 lg:col-start-2 xl:col-start-3 xl:row-start-1 xl:sticky xl:top-6 xl:self-start">
          <AchievementsCard
            summary={summary}
            onViewAll={() => setActiveTab("achievements")}
          />
          <MomentumCard summary={summary} />
          <RecentActivityCard
            limit={4}
            ratings={ratings}
            onViewAll={() => setActiveTab("activity")}
          />
        </aside>
      ) : null}

      {activeTab === "stats" ? (
        <CinematicBanner className="lg:col-start-2 xl:hidden" />
      ) : null}

      {followListMode ? (
        <FollowListDialog
          error={followListError}
          isLoading={isFollowListLoading}
          mode={followListMode}
          onClose={() => setFollowListMode(null)}
          users={followListUsers}
        />
      ) : null}
    </div>
  );
}
