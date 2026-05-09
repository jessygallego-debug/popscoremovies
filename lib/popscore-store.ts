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

export async function savePopScore(
  movieId: string,
  genre: string,
  ratings: Record<string, number>,
  questions: RatingQuestion[]
) {
  await supabaseFetch("/ratings", {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      movie_id: movieId,
      genre,
      ratings,
      weights: questions,
    }),
  });

  window.dispatchEvent(new Event(UPDATE_EVENT));
}

export async function getPopScore(movieId: string) {
  const response = await supabaseFetch(
    `/ratings?movie_id=eq.${encodeURIComponent(
      movieId
    )}&select=id,genre,ratings,weights,created_at,movie_id`
  );
  const submissions = (await response.json()) as RatingRow[];

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

      return total + question.weight * (averageRating / 5);
    },
    0
  );

  return {
    score: Math.round(weightedScore * 100),
    count: submissions.length,
  };
}

export function subscribeToPopScoreUpdates(callback: () => void) {
  window.addEventListener(UPDATE_EVENT, callback);

  return () => {
    window.removeEventListener(UPDATE_EVENT, callback);
  };
}
