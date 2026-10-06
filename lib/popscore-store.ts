"use client";

import { ratingToPercent } from "./rating-score";
export { ratingToPercent } from "./rating-score";

export const POPSCORE_RATINGS_UPDATED_EVENT = "popscore-ratings-updated";

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

function calculateSubmissionScore(submission: RatingRow) {
  const score = submission.weights.reduce(
    (total, question) => {
      const rating = submission.ratings[question.key];

      if (!rating) {
        return total;
      }

      return {
        percent: total.percent + question.weight * ratingToPercent(rating, submission.genre, submission.weights),
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
    signal: AbortSignal.timeout(8000),
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
  movieIds: string[]
) {
  const rows: RatingRow[] = [];
  const filter = movieIds.map(id => encodeURIComponent(JSON.stringify(id))).join(",");
  try {
    // Page the result so popular movies cannot truncate other movies' ratings.
    for (let offset = 0; ; offset += 1000) {
      const response = await supabaseFetch(
        `/${tableName}?movie_id=in.(${filter})&select=id,genre,ratings,weights,created_at,movie_id&order=id&limit=1000&offset=${offset}`
      );
      const page = await response.json() as RatingRow[];
      rows.push(...page.filter(hasCompletedRating));
      if (page.length < 1000) return rows;
    }
  } catch {
    return [];
  }
}

const pendingScores = new Map<string, Promise<PopScoreAggregate | null>>();
let queuedScores = new Map<string, Array<(score: PopScoreAggregate | null) => void>>();
let batchScheduled = false;

function flushScoreBatch() {
  const batch = queuedScores;
  queuedScores = new Map();
  batchScheduled = false;
  const ids = [...batch.keys()];
  for (let index = 0; index < ids.length; index += 40) {
    const chunk = ids.slice(index, index + 40);
    void Promise.all([fetchRatingRows("movie_ratings", chunk), fetchRatingRows("ratings", chunk)])
      .then(([profileRows, legacyRows]) => {
        for (const id of chunk) {
          const score = calculatePopScore(mergeRatingSources(
            profileRows.filter(row => String(row.movie_id) === id),
            legacyRows.filter(row => String(row.movie_id) === id)
          ));
          batch.get(id)?.forEach(resolve => resolve(score));
        }
      });
  }
}

export function notifyPopScoreUpdates() {
  pendingScores.clear();
  window.dispatchEvent(new Event(POPSCORE_RATINGS_UPDATED_EVENT));
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

export function getPopScore(movieId: string): Promise<PopScoreAggregate | null> {
  const pending = pendingScores.get(movieId);
  if (pending) return pending;
  const request = new Promise<PopScoreAggregate | null>(resolve => {
    queuedScores.set(movieId, [...(queuedScores.get(movieId) ?? []), resolve]);
  });
  pendingScores.set(movieId, request);
  void request.then(() => {
    if (pendingScores.get(movieId) === request) pendingScores.delete(movieId);
  });
  if (!batchScheduled) {
    batchScheduled = true;
    setTimeout(flushScoreBatch, 0);
  }
  return request;
}

export function subscribeToPopScoreUpdates(callback: () => void) {
  window.addEventListener(POPSCORE_RATINGS_UPDATED_EVENT, callback);

  return () => {
    window.removeEventListener(POPSCORE_RATINGS_UPDATED_EVENT, callback);
  };
}
