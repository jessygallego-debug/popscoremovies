import { NextRequest, NextResponse } from "next/server";
import { GENRE_RATING_CONFIGS, type GenreKey } from "@/lib/genre-rating-config";
import { genreLabelForKey, genreTmdbIdForKey } from "@/lib/profile-config";
import { getRecommendationMovies, type MovieSummary } from "@/lib/tmdb";

const RECOMMENDATION_LIMIT = 10;
const CANDIDATE_LIMIT = 300;
const FALLBACK_MESSAGE =
  "Rate more movies in this genre to unlock personalized recommendations.";

type RatingQuestion = {
  key: string;
  name: string;
  weight: number;
};

type MovieRatingRow = {
  created_at: string;
  genre: string;
  genre_names: string[] | null;
  movie_id: string;
  movie_title: string;
  popscore: number | null;
  poster_path: string | null;
  ratings: Record<string, number> | null;
  release_date: string | null;
  updated_at: string;
  user_id: string;
  weights: { key: string; weight: number }[] | null;
};

type MovieAggregate = {
  overallPopScore: number;
  questionAverages: Record<string, number>;
  totalRatings: number;
};

type DiscoveryRecommendation = MovieSummary & {
  explanation: string;
  overallPopScore: number;
  recommendationMode: "fallback" | "personalized";
  tasteMatchScore: number;
  totalRatings: number;
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

async function supabaseFetch<T>(path: string): Promise<T | null> {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const response = await fetch(`${config.restUrl}${path}`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<T>;
}

async function getMovieRatingRows() {
  const pageSize = 1000;
  const rows: MovieRatingRow[] = [];
  let offset = 0;

  for (;;) {
    const page = await supabaseFetch<MovieRatingRow[]>(
      `/movie_ratings?select=user_id,movie_id,movie_title,poster_path,release_date,genre,genre_names,ratings,weights,popscore,created_at,updated_at&order=updated_at.desc&limit=${pageSize}&offset=${offset}`
    );

    if (!page?.length) {
      break;
    }

    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

function isGenreKey(value: string): value is GenreKey {
  return value in GENRE_RATING_CONFIGS;
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function ratingHasPopScore(row: MovieRatingRow) {
  return Boolean(
    row.weights?.length && row.ratings && Object.keys(row.ratings).length > 0
  );
}

function rowMatchesGenre(row: MovieRatingRow, genre: GenreKey) {
  const selectedLabel = normalize(genreLabelForKey(genre));
  const rowGenre = normalize(row.genre);
  const rowGenreLabel = normalize(genreLabelForKey(row.genre));
  const rowGenreNames = row.genre_names?.map(normalize) ?? [];

  return (
    rowGenre === genre ||
    rowGenre === selectedLabel ||
    rowGenreLabel === selectedLabel ||
    rowGenreNames.includes(selectedLabel)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function tmdbPopScore(movie: MovieSummary) {
  return Math.round(clamp((movie.vote_average || 6.8) * 10, 0, 100));
}

function ratingFromScore(score: number) {
  return 1 + (clamp(score, 0, 100) / 100) * 4;
}

function buildMovieAggregates(
  rows: MovieRatingRow[],
  questions: readonly RatingQuestion[]
) {
  const rawAggregates = new Map<
    string,
    {
      popScoreTotal: number;
      questionTotals: Map<string, { count: number; total: number }>;
      totalRatings: number;
    }
  >();

  rows.forEach((row) => {
    if (!ratingHasPopScore(row)) {
      return;
    }

    const current = rawAggregates.get(row.movie_id) ?? {
      popScoreTotal: 0,
      questionTotals: new Map<string, { count: number; total: number }>(),
      totalRatings: 0,
    };

    current.popScoreTotal += Number(row.popscore ?? 0);
    current.totalRatings += 1;

    questions.forEach((question) => {
      const value = Number(row.ratings?.[question.key]);

      if (!Number.isFinite(value) || value <= 0) {
        return;
      }

      const questionTotal = current.questionTotals.get(question.key) ?? {
        count: 0,
        total: 0,
      };

      current.questionTotals.set(question.key, {
        count: questionTotal.count + 1,
        total: questionTotal.total + value,
      });
    });

    rawAggregates.set(row.movie_id, current);
  });

  const aggregates = new Map<string, MovieAggregate>();

  rawAggregates.forEach((aggregate, movieId) => {
    const questionAverages: Record<string, number> = {};

    questions.forEach((question) => {
      const questionTotal = aggregate.questionTotals.get(question.key);

      if (questionTotal?.count) {
        questionAverages[question.key] = questionTotal.total / questionTotal.count;
      }
    });

    aggregates.set(movieId, {
      overallPopScore: Math.round(
        aggregate.popScoreTotal / Math.max(aggregate.totalRatings, 1)
      ),
      questionAverages,
      totalRatings: aggregate.totalRatings,
    });
  });

  return aggregates;
}

function buildUserTasteProfile(
  highRatedRows: MovieRatingRow[],
  questions: readonly RatingQuestion[]
) {
  const tasteProfile: Record<string, number> = {};

  questions.forEach((question) => {
    const values = highRatedRows
      .map((row) => Number(row.ratings?.[question.key]))
      .filter((value) => Number.isFinite(value) && value > 0);

    tasteProfile[question.key] =
      values.length > 0
        ? values.reduce((total, value) => total + value, 0) / values.length
        : 3;
  });

  return tasteProfile;
}

function explainPersonalizedMatch(
  genre: GenreKey,
  tasteProfile: Record<string, number>,
  questions: readonly RatingQuestion[]
) {
  const strongestPreferences = [...questions]
    .sort((first, second) => {
      return (
        (tasteProfile[second.key] ?? 0) * second.weight -
        (tasteProfile[first.key] ?? 0) * first.weight
      );
    })
    .slice(0, 2)
    .map((question) => question.name.toLowerCase());

  const genreLabel = genreLabelForKey(genre);

  if (strongestPreferences.length === 0) {
    return `Because it lines up with your ${genreLabel} taste profile.`;
  }

  return `Because you tend to reward ${strongestPreferences.join(
    " and "
  )} in ${genreLabel}.`;
}

function explainFallbackMatch(genre: GenreKey, totalRatings: number) {
  const genreLabel = genreLabelForKey(genre);

  if (totalRatings > 0) {
    return `A strong ${genreLabel} pick with high PopScore fan ratings.`;
  }

  return `A trending ${genreLabel} pick while you build your taste profile.`;
}

function uniqueMovies(movies: MovieSummary[]) {
  const byId = new Map<number, MovieSummary>();

  movies.forEach((movie) => {
    if (!byId.has(movie.id)) {
      byId.set(movie.id, movie);
    }
  });

  return Array.from(byId.values());
}

function personalizeRecommendations({
  aggregates,
  genre,
  movies,
  questions,
  tasteProfile,
}: {
  aggregates: Map<string, MovieAggregate>;
  genre: GenreKey;
  movies: MovieSummary[];
  questions: readonly RatingQuestion[];
  tasteProfile: Record<string, number>;
}) {
  const explanation = explainPersonalizedMatch(genre, tasteProfile, questions);

  return movies
    .map((movie): DiscoveryRecommendation => {
      const aggregate = aggregates.get(String(movie.id));
      const overallPopScore = aggregate?.overallPopScore ?? tmdbPopScore(movie);
      const difference = questions.reduce((total, question) => {
        const movieQuestionScore =
          aggregate?.questionAverages[question.key] ??
          ratingFromScore(overallPopScore);

        return (
          total +
          Math.abs((tasteProfile[question.key] ?? 3) - movieQuestionScore) *
            question.weight
        );
      }, 0);
      const tasteMatchScore = Math.round(clamp(100 - difference * 20, 0, 100));

      return {
        ...movie,
        explanation,
        overallPopScore,
        recommendationMode: "personalized",
        tasteMatchScore,
        totalRatings: aggregate?.totalRatings ?? 0,
      };
    })
    .sort((first, second) => {
      return (
        second.tasteMatchScore - first.tasteMatchScore ||
        second.overallPopScore - first.overallPopScore ||
        second.totalRatings - first.totalRatings ||
        (second.popularity ?? 0) - (first.popularity ?? 0)
      );
    })
    .slice(0, RECOMMENDATION_LIMIT);
}

function fallbackRecommendations({
  aggregates,
  genre,
  movies,
}: {
  aggregates: Map<string, MovieAggregate>;
  genre: GenreKey;
  movies: MovieSummary[];
}) {
  const maxRatings = Math.max(
    1,
    ...movies.map(
      (movie) => aggregates.get(String(movie.id))?.totalRatings ?? 0
    )
  );
  const maxPopularity = Math.max(
    1,
    ...movies.map((movie) => movie.popularity ?? 0)
  );

  return movies
    .map((movie): DiscoveryRecommendation & { fallbackScore: number } => {
      const aggregate = aggregates.get(String(movie.id));
      const overallPopScore = aggregate?.overallPopScore ?? tmdbPopScore(movie);
      const totalRatings = aggregate?.totalRatings ?? 0;
      const ratingVolumeScore = (totalRatings / maxRatings) * 100;
      const trendingScore = ((movie.popularity ?? 0) / maxPopularity) * 100;
      const fallbackScore =
        overallPopScore * 0.6 + ratingVolumeScore * 0.3 + trendingScore * 0.1;

      return {
        ...movie,
        explanation: explainFallbackMatch(genre, totalRatings),
        fallbackScore,
        overallPopScore,
        recommendationMode: "fallback",
        tasteMatchScore: Math.round(clamp(fallbackScore, 0, 100)),
        totalRatings,
      };
    })
    .sort((first, second) => {
      return (
        second.fallbackScore - first.fallbackScore ||
        second.overallPopScore - first.overallPopScore ||
        second.totalRatings - first.totalRatings ||
        (second.popularity ?? 0) - (first.popularity ?? 0)
      );
    })
    .slice(0, RECOMMENDATION_LIMIT)
    .map((movie) => ({
      backdrop_path: movie.backdrop_path,
      explanation: movie.explanation,
      genre_ids: movie.genre_ids,
      id: movie.id,
      overview: movie.overview,
      overallPopScore: movie.overallPopScore,
      popularity: movie.popularity,
      poster_path: movie.poster_path,
      recommendationMode: movie.recommendationMode,
      release_date: movie.release_date,
      tasteMatchScore: movie.tasteMatchScore,
      title: movie.title,
      totalRatings: movie.totalRatings,
      vote_average: movie.vote_average,
    }));
}

export async function GET(request: NextRequest) {
  const genre = request.nextUrl.searchParams.get("genre") ?? "";
  const userId = request.nextUrl.searchParams.get("userId") ?? "";

  if (!isGenreKey(genre)) {
    return NextResponse.json({
      highRatedCount: 0,
      message: "Choose a valid genre to get recommendations.",
      mode: "fallback",
      movies: [],
    });
  }

  const tmdbGenreId = genreTmdbIdForKey(genre);

  if (!tmdbGenreId) {
    return NextResponse.json({
      highRatedCount: 0,
      message: "Choose a valid genre to get recommendations.",
      mode: "fallback",
      movies: [],
    });
  }

  const questions = GENRE_RATING_CONFIGS[genre].questions;
  const [movies, allRatingRows] = await Promise.all([
    getRecommendationMovies(tmdbGenreId, CANDIDATE_LIMIT),
    getMovieRatingRows(),
  ]);
  const genreRatingRows = allRatingRows.filter((row) =>
    rowMatchesGenre(row, genre)
  );
  const userRows = userId
    ? allRatingRows.filter((row) => row.user_id === userId)
    : [];
  const userRatedMovieIds = new Set(userRows.map((row) => row.movie_id));
  const userGenreRows = userRows.filter(
    (row) => rowMatchesGenre(row, genre) && ratingHasPopScore(row)
  );
  const highRatedRows = userGenreRows.filter(
    (row) => Number(row.popscore ?? 0) >= 75
  );
  const candidateMovies = uniqueMovies(movies).filter(
    (movie) => !userRatedMovieIds.has(String(movie.id))
  );
  const aggregates = buildMovieAggregates(genreRatingRows, questions);

  if (highRatedRows.length < 3) {
    return NextResponse.json({
      highRatedCount: highRatedRows.length,
      message: FALLBACK_MESSAGE,
      mode: "fallback",
      movies: fallbackRecommendations({
        aggregates,
        genre,
        movies: candidateMovies,
      }),
    });
  }

  const tasteProfile = buildUserTasteProfile(highRatedRows, questions);

  return NextResponse.json({
    highRatedCount: highRatedRows.length,
    message: "",
    mode: "personalized",
    movies: personalizeRecommendations({
      aggregates,
      genre,
      movies: candidateMovies,
      questions,
      tasteProfile,
    }),
  });
}
