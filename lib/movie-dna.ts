import {
  genreLabelForKey,
  normalizeProfileGenreKey,
} from "@/lib/profile-config";
import {
  GENRE_RATING_CONFIGS,
  type GenreKey,
} from "@/lib/genre-rating-config";

export type MovieDnaRating = {
  created_at: string;
  genre: string;
  genreNames?: string[];
  id: string;
  movieId: string;
  movieTitle: string;
  popscore: number;
  posterPath?: string | null;
  ratingSource?: string | null;
  ratings: Record<string, number>;
  releaseDate?: string | null;
  updated_at: string;
  weights: { key: string; weight: number }[];
  deleted_at?: string | null;
  is_deleted?: boolean;
};

export type MovieDnaPersonality =
  | "Story Seeker"
  | "Performance Fan"
  | "Rewatch Enthusiast"
  | "Balanced Movie Fan";

export type MovieDnaRankingKey =
  | "top-rated"
  | "story"
  | "acting"
  | "rewatch";

export type MovieDnaRankedMovie = MovieDnaRating & {
  actingScore: number | null;
  relevantScore: number;
  rewatchScore: number;
  storyScore: number;
};

export type MovieDnaGenreStat = {
  average: number;
  count: number;
  genre: string;
  highestRatedMovie: MovieDnaRating;
};

export type MovieDnaResult = {
  actingAverage: number;
  averagePopScore: number;
  eligibleRatings: MovieDnaRating[];
  favoriteGenre: MovieDnaGenreStat | null;
  genreStats: MovieDnaGenreStat[];
  mostRatedGenre: MovieDnaGenreStat | null;
  personality: MovieDnaPersonality | null;
  personalityDescription: string;
  rankings: Record<MovieDnaRankingKey, MovieDnaRankedMovie[]>;
  rewatchAverage: number;
  storyAverage: number;
  strongestTrait: "Storyline" | "Acting" | "Rewatch Score" | null;
  topGenres: MovieDnaGenreStat[];
};

export type MovieDnaGenreFilter = {
  count: number;
  key: GenreKey;
  label: string;
};

export type MovieDnaQuestionAverage = {
  average: number | null;
  key: string;
  label: string;
};

const PERSONALITY_DESCRIPTIONS: Record<MovieDnaPersonality, string> = {
  "Story Seeker": "A strong story is what makes a movie work for you.",
  "Performance Fan": "Great performances are what pull you into a movie.",
  "Rewatch Enthusiast":
    "Your favorites are the movies you want to experience again.",
  "Balanced Movie Fan":
    "You value story, performance, and rewatchability almost equally.",
};

const asTime = (value: string) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const compareNewest = (a: MovieDnaRating, b: MovieDnaRating) =>
  asTime(b.updated_at || b.created_at) - asTime(a.updated_at || a.created_at);

function primaryGenre(rating: MovieDnaRating) {
  const label = genreLabelForKey(rating.genre).trim();
  return label || rating.genreNames?.[0]?.trim() || "Unknown";
}
function coreScore(
  rating: MovieDnaRating,
  key: "story" | "acting" | "rewatch"
) {
  if (key === "acting") {
    // Fantasy and Western currently call the shared performance question
    // "Character". Keep those complete ratings comparable with Acting and
    // Voice Acting without mixing in genre-specific questions.
    return (
      rating.ratings.acting ??
      rating.ratings.voiceActing ??
      rating.ratings.character ??
      null
    );
  }

  return key === "story"
    ? rating.ratings.story ?? null
    : rating.ratings.rewatchability ?? null;
}

function isEligibleRating(rating: MovieDnaRating) {
  if (rating.deleted_at || rating.is_deleted) return false;
  if (rating.ratingSource?.toLowerCase().includes("letterboxd")) return false;

  const questionKeys = Array.from(
    new Set(rating.weights.map((question) => question.key))
  );

  return (
    questionKeys.length === 5 &&
    questionKeys.every((key) => {
      const value = rating.ratings[key];
      return Number.isFinite(value) && value >= 1 && value <= 5;
    }) &&
    coreScore(rating, "story") !== null &&
    coreScore(rating, "acting") !== null &&
    coreScore(rating, "rewatch") !== null
  );
}

export function getEligibleMovieDnaRatings(ratings: MovieDnaRating[]) {
  const newestByMovie = new Map<string, MovieDnaRating>();

  [...ratings].sort(compareNewest).forEach((rating) => {
    if (!newestByMovie.has(rating.movieId)) {
      newestByMovie.set(rating.movieId, rating);
    }
  });

  return Array.from(newestByMovie.values()).filter(isEligibleRating);
}

export function getMovieDnaGenreFilters(
  ratings: MovieDnaRating[]
): MovieDnaGenreFilter[] {
  const counts = new Map<GenreKey, number>();

  ratings.forEach((rating) => {
    const key = normalizeProfileGenreKey(rating.genre) as GenreKey;
    if (!key || !(key in GENRE_RATING_CONFIGS)) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts, ([key, count]) => ({
    count,
    key,
    label: GENRE_RATING_CONFIGS[key].title,
  })).sort((first, second) => first.label.localeCompare(second.label));
}

export function getMovieDnaGenreQuestionAverages(
  ratings: MovieDnaRating[],
  genre: GenreKey
): MovieDnaQuestionAverage[] {
  const genreRatings = ratings.filter(
    (rating) => normalizeProfileGenreKey(rating.genre) === genre
  );

  return GENRE_RATING_CONFIGS[genre].questions.map((question) => {
    const values = genreRatings
      .map((rating) => rating.ratings[question.key])
      .filter((value) => Number.isFinite(value));

    return {
      average: values.length > 0 ? average(values) : null,
      key: question.key,
      label: question.name,
    };
  });
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function movieHighScore(a: MovieDnaRating, b: MovieDnaRating) {
  return b.popscore - a.popscore || compareNewest(a, b);
}

export function getMovieDnaRatingsForGenre(
  ratings: MovieDnaRating[],
  genre: string
) {
  return ratings
    .filter((rating) => primaryGenre(rating) === genre)
    .sort(movieHighScore);
}

function getPersonality(story: number, acting: number, rewatch: number) {
  const traits = [
    { label: "Storyline" as const, personality: "Story Seeker" as const, value: story },
    { label: "Acting" as const, personality: "Performance Fan" as const, value: acting },
    {
      label: "Rewatch Score" as const,
      personality: "Rewatch Enthusiast" as const,
      value: rewatch,
    },
  ];
  const values = traits.map((trait) => trait.value);

  if (Math.max(...values) - Math.min(...values) <= 0.35) {
    return {
      personality: "Balanced Movie Fan" as const,
      strongestTrait: traits.find((trait) => trait.value === Math.max(...values))!
        .label,
    };
  }

  const strongest = traits.find(
    (trait) => trait.value === Math.max(...values)
  )!;
  return { personality: strongest.personality, strongestTrait: strongest.label };
}

function buildRanking(
  ratings: MovieDnaRating[],
  key: MovieDnaRankingKey
): MovieDnaRankedMovie[] {
  const enriched = ratings.map((rating) => ({
    ...rating,
    actingScore: coreScore(rating, "acting"),
    relevantScore:
      key === "top-rated"
        ? rating.popscore
        : key === "story"
          ? coreScore(rating, "story")!
          : key === "acting"
            ? coreScore(rating, "acting")!
            : coreScore(rating, "rewatch")!,
    rewatchScore: coreScore(rating, "rewatch")!,
    storyScore: coreScore(rating, "story")!,
  }));

  return enriched
    .sort((a, b) => {
      if (key === "top-rated") {
        return (
          b.popscore - a.popscore ||
          b.rewatchScore - a.rewatchScore ||
          compareNewest(a, b)
        );
      }

      return (
        b.relevantScore - a.relevantScore ||
        b.popscore - a.popscore ||
        compareNewest(a, b)
      );
    })
    .slice(0, 5);
}

export function calculateMovieDna(ratings: MovieDnaRating[]): MovieDnaResult {
  const eligibleRatings = getEligibleMovieDnaRatings(ratings);

  if (eligibleRatings.length === 0) {
    return {
      actingAverage: 0,
      averagePopScore: 0,
      eligibleRatings,
      favoriteGenre: null,
      genreStats: [],
      mostRatedGenre: null,
      personality: null,
      personalityDescription: "",
      rankings: { "top-rated": [], story: [], acting: [], rewatch: [] },
      rewatchAverage: 0,
      storyAverage: 0,
      strongestTrait: null,
      topGenres: [],
    };
  }

  const storyAverage = average(
    eligibleRatings.map((rating) => coreScore(rating, "story")!)
  );
  const actingAverage = average(
    eligibleRatings.map((rating) => coreScore(rating, "acting")!)
  );
  const rewatchAverage = average(
    eligibleRatings.map((rating) => coreScore(rating, "rewatch")!)
  );
  const genreGroups = new Map<string, MovieDnaRating[]>();

  eligibleRatings.forEach((rating) => {
    const genre = primaryGenre(rating);
    genreGroups.set(genre, [...(genreGroups.get(genre) ?? []), rating]);
  });

  const genreStats = Array.from(genreGroups, ([genre, genreRatings]) => {
    const sortedRatings = [...genreRatings].sort(movieHighScore);
    return {
      average: average(genreRatings.map((rating) => rating.popscore)),
      count: genreRatings.length,
      genre,
      highestRatedMovie: sortedRatings[0],
    };
  });
  const mostRatedGenre = [...genreStats].sort(
    (a, b) => b.count - a.count || a.genre.localeCompare(b.genre)
  )[0] ?? null;
  const favoriteGenre = [...genreStats]
    .filter((genre) => genre.count >= 3)
    .sort(
      (a, b) =>
        b.average - a.average ||
        b.count - a.count ||
        b.highestRatedMovie.popscore - a.highestRatedMovie.popscore ||
        a.genre.localeCompare(b.genre)
    )[0] ?? null;
  const { personality, strongestTrait } = getPersonality(
    storyAverage,
    actingAverage,
    rewatchAverage
  );

  return {
    actingAverage,
    averagePopScore: average(
      eligibleRatings.map((rating) => rating.popscore)
    ),
    eligibleRatings,
    favoriteGenre,
    genreStats,
    mostRatedGenre,
    personality: eligibleRatings.length >= 5 ? personality : null,
    personalityDescription:
      eligibleRatings.length >= 5 ? PERSONALITY_DESCRIPTIONS[personality] : "",
    rankings: {
      "top-rated": buildRanking(eligibleRatings, "top-rated"),
      story: buildRanking(eligibleRatings, "story"),
      acting: buildRanking(eligibleRatings, "acting"),
      rewatch: buildRanking(eligibleRatings, "rewatch"),
    },
    rewatchAverage,
    storyAverage,
    strongestTrait: eligibleRatings.length >= 5 ? strongestTrait : null,
    topGenres: [...genreStats]
      .filter((genre) => genre.count >= 2)
      .sort(
        (a, b) =>
          b.count - a.count || b.average - a.average || a.genre.localeCompare(b.genre)
      )
      .slice(0, 3),
  };
}
