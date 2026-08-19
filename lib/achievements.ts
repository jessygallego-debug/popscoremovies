export type AchievementRequirementType =
  | "ratings_count"
  | "reactions_count"
  | "unique_genres_rated"
  | "single_genre_ratings_count"
  | "rating_streak_days"
  | "ratings_this_week"
  | "ratings_under_50"
  | "ratings_90_plus"
  | "review_or_comment_count"
  | "received_like_count"
  | "discussion_count"
  | "discussion_reply_count"
  | "following_count"
  | "follower_count"
  | "movie_match_rating_80_plus"
  | "movie_match_ratings_count"
  | "rating_days_in_month";

export type AchievementColor =
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

export type Achievement = {
  badgeText?: string;
  color: AchievementColor;
  description: string;
  icon: string;
  id: string;
  name: string;
  requirementType: AchievementRequirementType;
  requirementValue: number;
};

export type AchievementProgressSummary = {
  discussionCount: number;
  followerCount: number;
  followingCount: number;
  maxDiscussionReplyCount: number;
  maxRatingDaysInMonth: number;
  maxRatingsInSingleGenre: number;
  movieMatchRating80PlusCount: number;
  movieMatchRatingsCount: number;
  quickReactionCount: number;
  ratingStreakDays: number;
  ratings90Plus: number;
  ratingsThisWeek: number;
  ratingsUnder50: number;
  receivedLikeCount: number;
  reviewOrCommentCount: number;
  totalMoviesRated: number;
  uniqueGenresRated: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_rating",
    name: "First Rating",
    description: "Rated your first movie.",
    icon: "☝️",
    color: "gold",
    requirementType: "ratings_count",
    requirementValue: 1,
  },
  {
    id: "first_reaction",
    name: "First Reaction",
    description: "Shared your first movie reaction.",
    icon: "😮",
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
    color: "purple",
    requirementType: "ratings_count",
    requirementValue: 50,
  },
  {
    id: "century_club",
    name: "Century Club",
    description: "Rated 100 movies.",
    icon: "💯",
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
    icon: "🎞️",
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
    icon: "📺",
    color: "blue",
    requirementType: "ratings_this_week",
    requirementValue: 5,
  },
  {
    id: "tough_critic",
    name: "Tough Critic",
    description: "Not every movie gets the popcorn.",
    icon: "🙅‍♂️",
    color: "grayRed",
    requirementType: "ratings_under_50",
    requirementValue: 5,
  },
  {
    id: "buttery_fan",
    name: "Buttery Fan",
    description: "You are in the top 1% of raters.",
    icon: "🍿",
    color: "butter",
    requirementType: "ratings_90_plus",
    requirementValue: 10,
  },
  {
    id: "first_take",
    name: "First Take",
    description: "Leave your first movie review/comment.",
    icon: "💬",
    color: "blue",
    requirementType: "review_or_comment_count",
    requirementValue: 1,
  },
  {
    id: "crowd_pleaser",
    name: "Crowd Pleaser",
    description: "Receive 10 likes on your ratings/comments.",
    icon: "❤️",
    color: "green",
    requirementType: "received_like_count",
    requirementValue: 10,
  },
  {
    id: "fan_favorite",
    name: "Fan Favorite",
    description: "Receive 50 likes.",
    icon: "💯",
    color: "gold",
    requirementType: "received_like_count",
    requirementValue: 50,
  },
  {
    id: "conversation_starter",
    name: "Conversation Starter",
    description: "Create your first Discussion.",
    icon: "🗣️",
    color: "purple",
    requirementType: "discussion_count",
    requirementValue: 1,
  },
  {
    id: "hot_topic",
    name: "Hot Topic",
    description: "Your Discussion gets 10 replies.",
    icon: "🧨",
    color: "orange",
    requirementType: "discussion_reply_count",
    requirementValue: 10,
  },
  {
    id: "movie_circle",
    name: "Movie Circle",
    description: "Follow 5 people.",
    icon: "🤝",
    color: "teal",
    requirementType: "following_count",
    requirementValue: 5,
  },
  {
    id: "influencer",
    name: "Influencer",
    description: "Gain 100 followers.",
    icon: "⭐",
    color: "silver",
    requirementType: "follower_count",
    requirementValue: 100,
  },
  {
    id: "perfect_match",
    name: "Perfect Match",
    description: "Rate a Movie Match recommendation 80%+.",
    icon: "🎯",
    color: "green",
    requirementType: "movie_match_rating_80_plus",
    requirementValue: 1,
  },
  {
    id: "movie_match_regular",
    name: "Movie Match Regular",
    description: "Rate 10 Movie Match recommendations.",
    icon: "🍿",
    color: "butter",
    requirementType: "movie_match_ratings_count",
    requirementValue: 10,
  },
  {
    id: "genre_master",
    name: "Genre Master",
    description: "Rate 50 movies in one genre.",
    icon: "🏆",
    color: "gold",
    requirementType: "single_genre_ratings_count",
    requirementValue: 50,
  },
  {
    id: "movie_month",
    name: "Movie Month",
    description: "Rate movies on 15 different days in one month.",
    icon: "📅",
    color: "blue",
    requirementType: "rating_days_in_month",
    requirementValue: 15,
  },
];

export function getAchievementValue(
  achievement: Achievement,
  summary: AchievementProgressSummary
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
    case "review_or_comment_count":
      return summary.reviewOrCommentCount;
    case "received_like_count":
      return summary.receivedLikeCount;
    case "discussion_count":
      return summary.discussionCount;
    case "discussion_reply_count":
      return summary.maxDiscussionReplyCount;
    case "following_count":
      return summary.followingCount;
    case "follower_count":
      return summary.followerCount;
    case "movie_match_rating_80_plus":
      return summary.movieMatchRating80PlusCount;
    case "movie_match_ratings_count":
      return summary.movieMatchRatingsCount;
    case "rating_days_in_month":
      return summary.maxRatingDaysInMonth;
    default:
      return 0;
  }
}

export function getAchievementProgress(
  achievement: Achievement,
  summary: AchievementProgressSummary
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

export function getNextAchievement(summary: AchievementProgressSummary) {
  return ACHIEVEMENTS.map((achievement) => ({
    achievement,
    progress: getAchievementProgress(achievement, summary),
  }))
    .filter((item) => !item.progress.isUnlocked)
    .sort((a, b) => b.progress.percent - a.progress.percent)[0];
}

export function getNextLockedAchievements({
  limit = 3,
  summary,
  unlockedAchievementIds,
}: {
  limit?: number;
  summary: AchievementProgressSummary;
  unlockedAchievementIds: Set<string>;
}) {
  return ACHIEVEMENTS.map((achievement) => ({
    achievement,
    progress: getAchievementProgress(achievement, summary),
  }))
    .filter(
      (item) =>
        !item.progress.isUnlocked &&
        !unlockedAchievementIds.has(item.achievement.id)
    )
    .sort((a, b) => b.progress.percent - a.progress.percent)
    .slice(0, limit);
}
