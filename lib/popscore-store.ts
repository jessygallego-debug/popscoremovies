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

export function ratingToPercent(rating: number) {
  return Math.min(Math.max((rating - 1) / 4, 0), 1);
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

  const questionTotals = new Map<
    string,
    {
      count: number;
      total: number;
      weight: number;
    }
  >();

  submissions.forEach((submission) => {
    submission.weights.forEach((question) => {
      const rating = submission.ratings[question.key];

      if (!rating) {
        return;
      }

      const current = questionTotals.get(question.key) ?? {
        count: 0,
        total: 0,
        weight: question.weight,
      };

      questionTotals.set(question.key, {
        count: current.count + 1,
        total: current.total + rating,
        weight: question.weight,
      });
    });
  });

  const weightedScore = Array.from(questionTotals.values()).reduce(
    (total, question) => {
      const averageRating = question.total / question.count;

      return total + question.weight * ratingToPercent(averageRating);
    },
    0
  );

  return {
    score: Math.round(weightedScore * 100),
    count: submissions.length,
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
