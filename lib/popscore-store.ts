"use client";

const UPDATE_EVENT = "popscore-ratings-updated";

type RatingQuestion = {
  key: string;
  weight: number;
};

type RatingSubmission = {
  genre: string;
  ratings: Record<string, number>;
  weights: RatingQuestion[];
};

type RatingRow = RatingSubmission & {
  id: string;
  movie_id: string;
  created_at: string;
};

type PopScoreAggregate = {
  count: number;
  score: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ratingToPercent(rating: number) {
  const anchors = [
    { rating: 1, percent: 0 },
    { rating: 2, percent: 0.4 },
    { rating: 3, percent: 0.6 },
    { rating: 4, percent: 0.8 },
    { rating: 5, percent: 1 },
  ];

  if (rating <= anchors[0].rating) {
    return anchors[0].percent;
  }

  if (rating >= anchors[anchors.length - 1].rating) {
    return anchors[anchors.length - 1].percent;
  }

  const upperIndex = anchors.findIndex((anchor) => rating <= anchor.rating);
  const lower = anchors[upperIndex - 1];
  const upper = anchors[upperIndex];
  const rangeProgress =
    (rating - lower.rating) / (upper.rating - lower.rating);

  return lower.percent + (upper.percent - lower.percent) * rangeProgress;
}

function calculateSubmissionScore(submission: RatingRow) {
  const score = submission.weights.reduce(
    (total, question) => {
      const rating = submission.ratings[question.key];

      if (!rating) {
        return total;
      }

      return {
        percent: total.percent + question.weight * ratingToPercent(rating),
        weight: total.weight + question.weight,
      };
    },
    { percent: 0, weight: 0 }
  );

  if (score.weight === 0) {
    return null;
  }

  return clamp(score.percent / score.weight, 0, 1);
}

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

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${config.restUrl}${path}`, {
    ...options,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}.`);
  }

  return response;
}

async function fetchRatingRows(
  tableName: "movie_ratings" | "ratings",
  movieId: string
) {
  try {
    const response = await supabaseFetch(
      `/${tableName}?movie_id=eq.${encodeURIComponent(
        movieId
      )}&select=id,genre,ratings,weights,created_at,movie_id`
    );

    return ((await response.json()) as RatingRow[]).filter(hasCompletedRating);
  } catch {
    return [];
  }
}

export function notifyPopScoreUpdates() {
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

function hasCompletedRating(submission: RatingRow) {
  return Boolean(
    submission.weights.length &&
      submission.ratings &&
      Object.keys(submission.ratings).length > 0
  );
}

function calculatePopScore(submissions: RatingRow[]): PopScoreAggregate | null {
  if (submissions.length === 0) {
    return null;
  }

  const submissionScores = submissions
    .map(calculateSubmissionScore)
    .filter((score): score is number => score !== null);

  if (submissionScores.length === 0) {
    return null;
  }

  const weightedScore =
    submissionScores.reduce((total, score) => total + score, 0) /
    submissionScores.length;

  return {
    score: clamp(Math.round(weightedScore * 100), 0, 100),
    count: submissionScores.length,
  };
}

function mergeRatingSources(
  profileRows: RatingRow[],
  legacyRows: RatingRow[]
) {
  if (legacyRows.length <= profileRows.length) {
    return profileRows;
  }

  return [...profileRows, ...legacyRows.slice(profileRows.length)];
}

export async function getPopScore(movieId: string) {
  const [profileRows, legacyRows] = await Promise.all([
    fetchRatingRows("movie_ratings", movieId),
    fetchRatingRows("ratings", movieId),
  ]);
  const submissions = mergeRatingSources(profileRows, legacyRows);

  return calculatePopScore(submissions);
}

export function subscribeToPopScoreUpdates(callback: () => void) {
  window.addEventListener(UPDATE_EVENT, callback);

  return () => {
    window.removeEventListener(UPDATE_EVENT, callback);
  };
}
