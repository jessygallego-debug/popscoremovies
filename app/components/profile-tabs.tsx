"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import MoviePosterImage from "@/app/components/movie-poster-image";
import QuickReactionBadge from "@/app/components/quick-reaction-badge";
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
import { posterUrl } from "@/lib/tmdb";

type TabKey =
  | "stats"
  | "ratings"
  | "achievements"
  | "activity";

type ProfileStatSummary = {
  average: number;
  highestGenre: string;
  lowestGenre: string;
  maxRatingsInSingleGenre: number;
  mostRatedGenre: string;
  quickReactionCount: number;
  ratingStreakDays: number;
  ratings90Plus: number;
  ratingsThisWeek: number;
  ratingsUnder50: number;
  totalMovieReactions: number;
  totalMoviesRated: number;
  uniqueGenresRated: number;
};

type RequirementType =
  | "ratings_count"
  | "reactions_count"
  | "unique_genres_rated"
  | "single_genre_ratings_count"
  | "rating_streak_days"
  | "ratings_this_week"
  | "ratings_under_50"
  | "ratings_90_plus";

type Achievement = {
  badgeText?: string;
  color:
    | "black"
    | "blue"
    | "butter"
    | "gold"
    | "grayRed"
    | "green"
    | "orange"
    | "purple"
    | "silver"
    | "teal";
  description: string;
  icon: string;
  id: string;
  name: string;
  requirementType: RequirementType;
  requirementValue: number;
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

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_rating",
    name: "First Rating",
    description: "Rated your first movie.",
    icon: "⭐",
    color: "gold",
    requirementType: "ratings_count",
    requirementValue: 1,
  },
  {
    id: "first_reaction",
    name: "First Reaction",
    description: "Shared your first movie reaction.",
    icon: "🔥",
    color: "orange",
    requirementType: "reactions_count",
    requirementValue: 1,
  },
  {
    id: "popcorn_rookie",
    name: "Popcorn Rookie",
    description: "Rated 5 movies.",
    icon: "🍿",
    color: "green",
    requirementType: "ratings_count",
    requirementValue: 5,
  },
  {
    id: "movie_buff",
    name: "Movie Buff",
    description: "Rated 50 movies.",
    icon: "🎬",
    badgeText: "50",
    color: "purple",
    requirementType: "ratings_count",
    requirementValue: 50,
  },
  {
    id: "century_club",
    name: "Century Club",
    description: "Rated 100 movies.",
    icon: "💯",
    badgeText: "100",
    color: "black",
    requirementType: "ratings_count",
    requirementValue: 100,
  },
  {
    id: "genre_explorer",
    name: "Genre Explorer",
    description: "Rated movies across 5 genres.",
    icon: "🎭",
    color: "teal",
    requirementType: "unique_genres_rated",
    requirementValue: 5,
  },
  {
    id: "genre_specialist",
    name: "Genre Specialist",
    description: "Rated 25 movies in a single genre.",
    icon: "◈",
    color: "purple",
    requirementType: "single_genre_ratings_count",
    requirementValue: 25,
  },
  {
    id: "balanced_critic",
    name: "Balanced Critic",
    description: "Rated movies across 10 genres.",
    icon: "⚖",
    color: "silver",
    requirementType: "unique_genres_rated",
    requirementValue: 10,
  },
  {
    id: "hot_streak",
    name: "Hot Streak",
    description: "Kept a 3-day rating streak.",
    icon: "🔥",
    color: "orange",
    requirementType: "rating_streak_days",
    requirementValue: 3,
  },
  {
    id: "weekly_watcher",
    name: "Weekly Watcher",
    description: "Rated 5 movies this week.",
    icon: "▦",
    color: "blue",
    requirementType: "ratings_this_week",
    requirementValue: 5,
  },
  {
    id: "tough_critic",
    name: "Tough Critic",
    description: "Not every movie gets the popcorn.",
    icon: "▤",
    color: "grayRed",
    requirementType: "ratings_under_50",
    requirementValue: 5,
  },
  {
    id: "buttery_fan",
    name: "Buttery Fan",
    description: "You know a great movie when you see one.",
    icon: "🍿",
    color: "butter",
    requirementType: "ratings_90_plus",
    requirementValue: 10,
  },
];

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
    minRatings: 25,
    topPercentile: 50,
    requirementLabel: "25+ or top 50%",
    icon: "🍿",
    accent: "#3b82f6",
    description: "You've rated more than half of PopScore users.",
  },
  {
    id: "theater_regular",
    name: "Theater Regular",
    minRatings: 50,
    topPercentile: 25,
    requirementLabel: "50+ or top 25%",
    icon: "🍿",
    accent: "#a855f7",
    description: "You're becoming a serious PopScore rater.",
  },
  {
    id: "popscore_pro",
    name: "PopScore Pro",
    minRatings: 100,
    topPercentile: 10,
    requirementLabel: "100+ or top 10%",
    icon: "★",
    accent: "#facc15",
    description: "Your ratings are shaping PopScore.",
  },
  {
    id: "elite_critic",
    name: "Elite Critic",
    minRatings: 200,
    topPercentile: 5,
    requirementLabel: "200+ or top 5%",
    icon: "🎬",
    accent: "#fb923c",
    description: "You're one of the most active movie raters.",
  },
  {
    id: "buttery_legend",
    name: "Buttery Legend",
    minRatings: 500,
    topPercentile: 1,
    requirementLabel: "500+ or top 1%",
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

function getLongestStreak(ratings: UserMovieRating[]) {
  const dateKeys = Array.from(
    new Set(ratings.map((rating) => localDateKey(rating.created_at)))
  ).sort();

  if (dateKeys.length === 0) {
    return 0;
  }

  let current = 1;
  let longest = 1;

  for (let index = 1; index < dateKeys.length; index += 1) {
    const previous = new Date(`${dateKeys[index - 1]}T00:00:00`);
    const next = new Date(`${dateKeys[index]}T00:00:00`);
    const difference = Math.round((next.getTime() - previous.getTime()) / DAY_MS);

    current = difference === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }

  return longest;
}

function getProfileStatSummary(ratings: UserMovieRating[]): ProfileStatSummary {
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

  return {
    average,
    highestGenre: highest?.genre ?? "None",
    lowestGenre: lowest?.genre ?? "None",
    maxRatingsInSingleGenre: Math.max(0, ...Array.from(genreCounts.values())),
    mostRatedGenre: mostRated?.genre ?? "None",
    quickReactionCount: ratings.filter((rating) => Boolean(rating.quick_reaction))
      .length,
    ratingStreakDays: getLongestStreak(popScoreRatings),
    ratings90Plus: popScoreRatings.filter((rating) => rating.popscore >= 90).length,
    ratingsThisWeek: popScoreRatings.filter(
      (rating) => new Date(rating.created_at).getTime() >= weekAgo
    ).length,
    ratingsUnder50: popScoreRatings.filter((rating) => rating.popscore < 50).length,
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
  return POPSCORE_TIERS.reduce((currentTier, tier) => {
    const qualifiesByRatings = totalMoviesRated >= tier.minRatings;
    const qualifiesByPercentile =
      totalMoviesRated > 0 &&
      Boolean(tier.topPercentile) &&
      topPercentile <= Number(tier.topPercentile);

    return qualifiesByRatings || qualifiesByPercentile ? tier : currentTier;
  }, POPSCORE_TIERS[0]);
}

function getAchievementValue(
  achievement: Achievement,
  summary: ProfileStatSummary
) {
  switch (achievement.requirementType) {
    case "ratings_count":
      return summary.totalMoviesRated;
    case "reactions_count":
      return summary.quickReactionCount;
    case "unique_genres_rated":
      return summary.uniqueGenresRated;
    case "single_genre_ratings_count":
      return summary.maxRatingsInSingleGenre;
    case "rating_streak_days":
      return summary.ratingStreakDays;
    case "ratings_this_week":
      return summary.ratingsThisWeek;
    case "ratings_under_50":
      return summary.ratingsUnder50;
    case "ratings_90_plus":
      return summary.ratings90Plus;
    default:
      return 0;
  }
}

function getAchievementProgress(
  achievement: Achievement,
  summary: ProfileStatSummary
) {
  const value = getAchievementValue(achievement, summary);
  const progress = Math.min(value, achievement.requirementValue);

  return {
    isUnlocked: value >= achievement.requirementValue,
    percent: Math.round((progress / achievement.requirementValue) * 100),
    text: `${progress} / ${achievement.requirementValue}`,
    value,
  };
}

function getNextAchievement(summary: ProfileStatSummary) {
  return ACHIEVEMENTS.map((achievement) => ({
    achievement,
    progress: getAchievementProgress(achievement, summary),
  }))
    .filter((item) => !item.progress.isUnlocked)
    .sort((a, b) => b.progress.percent - a.progress.percent)[0];
}

function profilePanelClass(className = "") {
  return `rounded-3xl border border-slate-800/90 bg-slate-950/90 shadow-xl shadow-black/25 ${className}`;
}

function ProfileSidebar({
  activeTab,
  onTabChange,
  profile,
  summary,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  profile: ProfileRecord;
  summary: ProfileStatSummary;
}) {
  const avatar = avatarForKey(profile.avatar_key);
  const navItems: { key: TabKey; label: string }[] = [
    { key: "stats", label: "Overview" },
    { key: "ratings", label: "Ratings" },
    { key: "achievements", label: "Achievements" },
  ];

  return (
    <aside className={profilePanelClass("p-5 xl:sticky xl:top-6 xl:self-start")}>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-28 w-28 items-center justify-center rounded-full border border-yellow-400/50 bg-yellow-400/10 text-6xl shadow-lg shadow-yellow-500/10">
          {avatar.icon}
        </span>
        <h1 className="mt-4 break-all text-3xl font-black text-white">
          @{profile.username}
        </h1>
        {profile.favorite_genre ? (
          <span className="mt-3 rounded-full bg-yellow-400 px-4 py-1.5 text-sm font-black text-black">
            {genreLabelForKey(profile.favorite_genre)}
          </span>
        ) : null}
        <p className="mt-3 text-sm font-bold text-slate-400">
          Member since {formatDate(profile.created_at)}
        </p>
      </div>

      <div className="mt-6 space-y-2 border-t border-slate-800 pt-6">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onTabChange(item.key)}
            className={`flex w-full items-center rounded-2xl border px-5 py-3 text-left text-sm font-black transition ${
              activeTab === item.key
                ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300"
                : "border-transparent text-slate-300 hover:border-slate-700 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Link
        href="/profile/edit"
        className="mt-6 flex w-full items-center justify-center rounded-2xl border border-slate-700 bg-black/30 px-4 py-3 text-sm font-black text-slate-200 transition hover:border-yellow-400 hover:text-yellow-300"
      >
        Edit PopFile
      </Link>

      <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
        <p className="text-sm font-black text-yellow-300">PopFile Momentum</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-black text-white">
              {summary.totalMoviesRated}
            </p>
            <p className="text-xs font-bold text-slate-400">movies rated</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-yellow-300">
              {summary.ratingStreakDays}
            </p>
            <p className="text-xs font-bold text-slate-400">day streak</p>
          </div>
        </div>
      </div>
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
          icon: "text-4xl",
          outer: "h-24 w-24",
          shine: "top-4 h-3",
          stripe: "bottom-3 h-1.5 w-10",
        }
      : {
          icon: "text-xl",
          outer: "h-12 w-12",
          shine: "top-2 h-2",
          stripe: "bottom-1.5 h-1 w-6",
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
        {isMuted ? "🔒" : tier.icon}
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
  const circlePercent = Math.max(4, 100 - percentile.topPercentile);

  return (
    <section className={profilePanelClass("overflow-hidden p-5 sm:p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">Your PopScore Status</h2>
          <p className="mt-1 text-sm font-bold text-slate-400">
            {tier.description}
          </p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-black text-slate-300">
          All-time
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_128px] lg:items-center">
        <TierBadge tier={tier} />
        <div className="min-w-0">
          <h3 className="text-3xl font-black" style={{ color: tier.accent }}>
            {tier.name}
          </h3>
          <p className="mt-2 text-sm font-bold text-slate-300">
            You&apos;re in the top{" "}
            <span className="text-white">{percentile.topPercentile}%</span> of all
            PopScore raters.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniMetric
              label="Total Movies Rated"
              value={summary.totalMoviesRated}
            />
            <MiniMetric
              label="Rating Percentile"
              value={`Top ${percentile.topPercentile}%`}
            />
            <MiniMetric label="Ranking" value={`#${percentile.rank}`} />
          </div>
        </div>

        <div
          className="mx-auto flex h-28 w-28 items-center justify-center rounded-full p-2.5"
          style={{
            background: `conic-gradient(${tier.accent} ${circlePercent}%, rgba(30, 41, 59, 0.85) 0)`,
          }}
        >
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-950 text-center">
            <span className="text-xs font-black uppercase text-slate-400">Top</span>
            <span className="text-3xl font-black" style={{ color: tier.accent }}>
              {percentile.topPercentile}%
            </span>
            <span className="text-xs font-bold text-slate-400">of raters</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold text-slate-300">
            Progress to next tier:{" "}
            <span style={{ color: nextTier?.accent ?? tier.accent }}>
              {nextTier?.name ?? "Top tier reached"}
            </span>
          </p>
          <p className="text-sm font-bold text-slate-400">
            {nextTier
              ? `${ratingsRemaining} more ratings to go`
              : "You reached the highest tier"}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-purple-500 to-blue-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="w-20 text-right text-sm font-black text-white">
            {nextTier
              ? `${summary.totalMoviesRated} / ${progressTarget}`
              : `${summary.totalMoviesRated}`}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {POPSCORE_TIERS.map((item, index) => (
          <div key={item.id} className="flex flex-col items-center text-center">
            <TierBadge
              tier={item}
              size="small"
              isMuted={index > currentTierIndex}
            />
            <p
              className="mt-2 text-xs font-black"
              style={{ color: index <= currentTierIndex ? item.accent : "#94a3b8" }}
            >
              {item.name}
            </p>
            <p className="mt-1 text-[11px] font-bold text-slate-500">
              {item.requirementLabel}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/30 p-3">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-h-28 rounded-2xl border border-slate-800 bg-black/35 p-4">
      <span className="text-2xl font-black text-yellow-400">{icon}</span>
      <p className="mt-3 break-words text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function ProfileStatsCard({
  summary,
}: {
  summary: ProfileStatSummary;
}) {
  return (
    <section className={profilePanelClass("p-6")}>
      <h2 className="text-xl font-black text-white">Your Stats</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon="▣"
          label="Total Movies Rated"
          value={summary.totalMoviesRated}
        />
        <StatCard
          icon="♡"
          label="Total Movie Reactions"
          value={summary.totalMovieReactions}
        />
        <StatCard
          icon="↗"
          label="Average PopScore"
          value={summary.totalMoviesRated ? `${summary.average}%` : "NR"}
        />
        <StatCard
          icon="☆"
          label="Most Rated Genre"
          value={summary.mostRatedGenre}
        />
        <StatCard
          icon="♕"
          label="Highest Rated Genre"
          value={summary.highestGenre}
        />
        <StatCard
          icon="↘"
          label="Lowest Rated Genre"
          value={summary.lowestGenre}
        />
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
      icon: "text-4xl",
      image: "h-16 w-16",
      outer: "h-24 w-24",
      shine: "top-4 h-3",
    },
    medium: {
      badgeText: "bottom-2 text-[11px]",
      icon: "text-3xl",
      image: "h-14 w-14",
      outer: "h-20 w-20",
      shine: "top-3 h-2.5",
    },
    small: {
      badgeText: "bottom-1.5 text-[10px]",
      icon: "text-2xl",
      image: "h-12 w-12",
      outer: "h-[68px] w-[68px]",
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
              {displayIcon}
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
          <p className="mt-3 line-clamp-1 text-sm font-black text-white">
            {achievement.name}
          </p>
          <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">
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
    <section className={profilePanelClass("p-5")}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white">Achievements</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm font-black text-purple-300 transition hover:text-yellow-300"
        >
          View all
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-3">
        {featured.map((achievement) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            compact
            summary={summary}
          />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-black/35 p-4">
        {nextAchievement ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-black text-white">Next Achievement</p>
              <p className="text-xs font-bold text-slate-400">
                {nextAchievement.progress.text}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <AchievementBadge
                achievement={nextAchievement.achievement}
                compact
                showCaption={false}
                summary={summary}
              />
              <div className="min-w-0 flex-1">
                <p className="font-black text-white">
                  {nextAchievement.achievement.name}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
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
    <section className={profilePanelClass("p-5")}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white">Recent Activity</h2>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm font-black text-purple-300 transition hover:text-yellow-300"
          >
            View all
          </button>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-4 divide-y divide-slate-800">
          {items.map((rating) => {
            const isFullRating = hasPopScoreRating(rating);

            return (
              <article
                key={rating.id}
                className="grid grid-cols-[52px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[52px_minmax(0,1fr)_auto]"
              >
                <MoviePoster
                  movieId={rating.movieId}
                  path={rating.posterPath}
                  title={rating.movieTitle}
                  size="small"
                />
                <div className="min-w-0">
                  <p className="line-clamp-2 font-black text-white">
                    {isFullRating ? "Rated" : "Reacted to"} {rating.movieTitle}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-yellow-400/10 px-2.5 py-1 text-sm font-black text-yellow-300">
                      {isFullRating ? `${rating.popscore}%` : "Reaction"}
                    </span>
                    {rating.quick_reaction ? (
                      <QuickReactionBadge reaction={rating.quick_reaction} />
                    ) : null}
                  </div>
                </div>
                <p className="col-start-2 text-xs font-bold text-slate-500 sm:col-start-auto sm:pt-1 sm:text-right">
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
  if (ratings.length === 0) {
    return <EmptyState text="No ratings yet." />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ratings.map((rating) => (
        <article
          key={rating.id}
          className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-4"
        >
          <MoviePoster
            movieId={rating.movieId}
            path={rating.posterPath}
            title={rating.movieTitle}
          />
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-black text-white">
              {rating.movieTitle}
            </h3>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {rating.genreNames[0] ?? genreLabelForKey(rating.genre)}
            </p>
            <p className="mt-3 text-2xl font-black text-yellow-400">
              {rating.popscore}%
            </p>
            <div className="mt-2">
              {rating.quick_reaction ? (
                <QuickReactionBadge reaction={rating.quick_reaction} />
              ) : null}
            </div>
            <p className="mt-3 text-xs font-bold text-slate-500">
              Rated {formatDate(rating.created_at)}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function AllAchievements({ summary }: { summary: ProfileStatSummary }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {ACHIEVEMENTS.map((achievement) => {
        const progress = getAchievementProgress(achievement, summary);

        return (
          <article
            key={achievement.id}
            className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5"
          >
            <div className="flex items-center gap-4">
              <AchievementBadge
                achievement={achievement}
                size="medium"
                showCaption={false}
                summary={summary}
              />
              <div className="min-w-0">
                <h3 className="font-black text-white">{achievement.name}</h3>
                <p className="mt-1 text-sm font-bold text-slate-400">
                  {achievement.description}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-yellow-400"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-black text-slate-400">
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
    <section className={profilePanelClass("p-6")}>
      <h2 className="text-xl font-black text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
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
  const [fallbackPath, setFallbackPath] = useState<string | null>(null);
  const poster = posterUrl(path ?? fallbackPath ?? null);
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

    if (path || !movieId) {
      return () => {
        isCurrent = false;
      };
    }

    fetch(`/api/movie-poster?movie=${encodeURIComponent(movieId)}`)
      .then((response) => response.json())
      .then((data: { posterPath?: string | null }) => {
        if (isCurrent && data.posterPath) {
          setFallbackPath(data.posterPath);
        }
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, [movieId, path]);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-slate-900 ${dimensions}`}
    >
      {poster ? (
        <MoviePosterImage
          src={poster}
          alt={title}
          sizes={size === "small" ? "52px" : "80px"}
          className="object-cover"
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

export default function ProfileTabs({ username }: { username: string }) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab: TabKey =
    requestedTab === "ratings" ||
    requestedTab === "achievements" ||
    requestedTab === "activity"
      ? requestedTab
      : "stats";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [ratings, setRatings] = useState<UserMovieRating[]>([]);
  const [ratingPopulation, setRatingPopulation] = useState<UserRatingCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => setActiveTab(initialTab));
  }, [initialTab]);

  useEffect(() => {
    let isCurrent = true;

    getProfileByUsername(username).then((nextProfile) => {
      if (!isCurrent) {
        return;
      }

      setProfile(nextProfile);
      if (!nextProfile) {
        setIsLoading(false);
        return;
      }

      Promise.all([
        getUserRatings(nextProfile.user_id),
        getAllUserRatingCounts(),
      ]).then(([nextRatings, nextRatingPopulation]) => {
        if (!isCurrent) {
          return;
        }

        setRatings(nextRatings);
        setRatingPopulation(nextRatingPopulation);
        setIsLoading(false);
      });
    });

    return () => {
      isCurrent = false;
    };
  }, [username]);

  const summary = useMemo(() => getProfileStatSummary(ratings), [ratings]);

  if (isLoading) {
    return <EmptyState text="Loading profile..." />;
  }

  if (!profile) {
    return <EmptyState text="Profile not found." />;
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
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_380px] 2xl:grid-cols-[280px_minmax(0,1fr)_430px]">
      <ProfileSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profile={profile}
        summary={summary}
      />

      <main className="space-y-6">
        <PopScoreStatusCard
          percentile={percentile}
          summary={summary}
          tier={currentTier}
        />
        <ProfileStatsCard summary={summary} />

        {activeTab === "ratings" ? (
          <SectionCard title="Ratings History">
            <RatingsHistory ratings={fullRatings} />
          </SectionCard>
        ) : null}
        {activeTab === "achievements" ? (
          <SectionCard title="All Achievements">
            <AllAchievements summary={summary} />
          </SectionCard>
        ) : null}
        {activeTab === "activity" ? (
          <RecentActivityCard ratings={ratings} showAll />
        ) : null}
      </main>

      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <AchievementsCard
          summary={summary}
          onViewAll={() => setActiveTab("achievements")}
        />
        <RecentActivityCard
          ratings={ratings}
          onViewAll={() => setActiveTab("activity")}
        />
      </aside>
    </div>
  );
}
