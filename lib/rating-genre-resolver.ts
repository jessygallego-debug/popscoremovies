import {
  GENRE_RATING_CONFIGS,
  type GenreKey,
} from "@/lib/genre-rating-config";

export type RatingGenreConfidence = "high" | "low" | "medium";

export type RatingGenreDecision = {
  alternatives: GenreKey[];
  confidence: RatingGenreConfidence;
  genre: GenreKey;
  source: "automatic" | "consensus";
};

type AutomaticGenreInput = {
  genreNames: string[];
  keywords?: string[];
};

const GENRE_KEY_BY_TMDB_NAME: Record<string, GenreKey> = {
  Action: "action",
  Adventure: "adventure",
  Animation: "animated",
  Comedy: "comedy",
  Documentary: "documentary",
  Drama: "drama",
  Family: "family",
  Fantasy: "fantasy",
  Horror: "horror",
  Music: "musical",
  Mystery: "mystery",
  Romance: "romance",
  "Science Fiction": "scifi",
  Thriller: "thriller",
  War: "war",
  Western: "western",
};

const BASE_GENRE_SCORES: Record<GenreKey, number> = {
  action: 72,
  adventure: 70,
  animated: 100,
  comedy: 62,
  documentary: 96,
  drama: 50,
  family: 68,
  fantasy: 80,
  horror: 90,
  musical: 92,
  mystery: 78,
  romance: 64,
  romcom: 88,
  scifi: 82,
  thriller: 76,
  war: 84,
  western: 86,
};

const KEYWORD_SIGNALS: Partial<Record<GenreKey, readonly string[]>> = {
  action: ["chase", "combat", "martial arts", "shootout"],
  adventure: ["expedition", "journey", "treasure hunt"],
  comedy: [
    "buddy comedy",
    "dark comedy",
    "parody",
    "satire",
    "satirical",
    "slapstick",
    "stand-up comedy",
  ],
  fantasy: ["dragon", "fairy tale", "magic", "mythology", "wizard"],
  horror: [
    "body horror",
    "folk horror",
    "gore",
    "haunted house",
    "monster",
    "occult",
    "psychological horror",
    "serial killer",
    "slasher",
    "supernatural",
    "survival horror",
    "vampire",
    "zombie",
  ],
  mystery: ["detective", "investigation", "murder mystery", "whodunit"],
  romance: ["love story"],
  romcom: ["romantic comedy", "romcom"],
  scifi: [
    "alien",
    "artificial intelligence",
    "dystopia",
    "future",
    "space travel",
    "time travel",
  ],
  thriller: [
    "cat and mouse",
    "conspiracy",
    "hostage",
    "psychological thriller",
    "suspense",
  ],
};

const AMBIGUOUS_GENRE_PAIRS = [
  ["action", "adventure"],
  ["comedy", "drama"],
  ["mystery", "thriller"],
] as const satisfies readonly (readonly [GenreKey, GenreKey])[];

export function isRatingGenreKey(value: string): value is GenreKey {
  return value in GENRE_RATING_CONFIGS;
}

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function pairIsAmbiguous(first: GenreKey, second: GenreKey) {
  return AMBIGUOUS_GENRE_PAIRS.some(
    ([left, right]) =>
      (first === left && second === right) ||
      (first === right && second === left)
  );
}

export function resolveAutomaticRatingGenre({
  genreNames,
  keywords = [],
}: AutomaticGenreInput): RatingGenreDecision {
  const tmdbGenres = new Set(genreNames);
  const candidateGenres = genreNames
    .map((genreName) => GENRE_KEY_BY_TMDB_NAME[genreName])
    .filter((genre, index, genres): genre is GenreKey =>
      Boolean(genre && genres.indexOf(genre) === index)
    );

  if (tmdbGenres.has("Romance") && tmdbGenres.has("Comedy")) {
    candidateGenres.push("romcom");
  }

  if (candidateGenres.length === 0) {
    return {
      alternatives: [],
      confidence: "medium",
      genre: "action",
      source: "automatic",
    };
  }

  const normalizedKeywords = new Set(keywords.map(normalized));
  const scores = candidateGenres.map((genre, index) => {
    const keywordMatches = (KEYWORD_SIGNALS[genre] ?? []).filter((keyword) =>
      normalizedKeywords.has(keyword)
    ).length;

    return {
      genre,
      index,
      keywordMatches,
      score:
        BASE_GENRE_SCORES[genre] +
        keywordMatches * 12 +
        (index === 0 ? 2 : 0),
    };
  });

  scores.sort(
    (first, second) =>
      second.score - first.score ||
      first.index - second.index
  );

  const winner = scores[0];
  const runnerUp = scores[1];
  const isLowConfidence = Boolean(
    runnerUp &&
      winner.keywordMatches === 0 &&
      runnerUp.keywordMatches === 0 &&
      pairIsAmbiguous(winner.genre, runnerUp.genre)
  );
  const margin = runnerUp ? winner.score - runnerUp.score : Infinity;

  return {
    alternatives: isLowConfidence
      ? [winner.genre, runnerUp!.genre]
      : [],
    confidence: isLowConfidence ? "low" : margin >= 8 ? "high" : "medium",
    genre: winner.genre,
    source: "automatic",
  };
}

export function applyRatingGenreConsensus(
  decision: RatingGenreDecision,
  consensusGenre?: string | null
): RatingGenreDecision {
  if (!consensusGenre || !isRatingGenreKey(consensusGenre)) {
    return decision;
  }

  if (!decision.alternatives.includes(consensusGenre)) {
    return decision;
  }

  return {
    alternatives: [],
    confidence: "high",
    genre: consensusGenre,
    source: "consensus",
  };
}
