export const GENRE_RATING_CONFIGS = {
  horror: {
    title: "Horror",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "scareFactor", name: "Scare Factor", weight: 0.25 },
      { key: "originality", name: "Originality", weight: 0.15 },
    ],
  },
  scifi: {
    title: "Sci-Fi",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "visualEffects", name: "Visual Effects", weight: 0.3 },
      { key: "originality", name: "Originality", weight: 0.1 },
    ],
  },
  action: {
    title: "Action",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "actionSequences", name: "Action Sequences", weight: 0.3 },
      { key: "pace", name: "Pace", weight: 0.1 },
    ],
  },
  adventure: {
    title: "Adventure",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "exploration", name: "Exploration", weight: 0.25 },
      { key: "excitement", name: "Excitement", weight: 0.15 },
    ],
  },
  comedy: {
    title: "Comedy",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "humor", name: "Humor", weight: 0.3 },
      { key: "quotability", name: "Quotability", weight: 0.1 },
    ],
  },
  romcom: {
    title: "Rom-Com",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "chemistry", name: "Chemistry", weight: 0.25 },
      { key: "humor", name: "Humor", weight: 0.15 },
    ],
  },
  romance: {
    title: "Romance",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "chemistry", name: "Chemistry", weight: 0.25 },
      { key: "emotionalImpact", name: "Emotional Impact", weight: 0.15 },
    ],
  },
  animated: {
    title: "Animated",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "voiceActing", name: "Voice Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "animationQuality", name: "Animation Quality", weight: 0.25 },
      { key: "emotionalImpact", name: "Emotional Impact", weight: 0.15 },
    ],
  },
  musical: {
    title: "Musical",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "songQuality", name: "Song Quality", weight: 0.25 },
      { key: "choreography", name: "Choreography", weight: 0.15 },
    ],
  },
  drama: {
    title: "Drama",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "conflict", name: "Conflict", weight: 0.2 },
      { key: "tension", name: "Tension", weight: 0.2 },
    ],
  },
  mystery: {
    title: "Mystery",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "intrigue", name: "Intrigue", weight: 0.25 },
      { key: "mysteryPayoff", name: "Mystery Payoff", weight: 0.15 },
    ],
  },
  family: {
    title: "Family",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "familyEnjoyment", name: "Family Enjoyment", weight: 0.25 },
      { key: "heartWarmth", name: "Heart/Warmth", weight: 0.15 },
    ],
  },
  documentary: {
    title: "Documentary",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "informativeValue", name: "Informative Value", weight: 0.25 },
      { key: "impact", name: "Impact", weight: 0.15 },
    ],
  },
  war: {
    title: "War",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "battleScenes", name: "Battle Scenes", weight: 0.25 },
      { key: "emotionalImpact", name: "Emotional Impact", weight: 0.15 },
    ],
  },
  western: {
    title: "Western",
    questions: [
      { key: "story", name: "Storyline", weight: 0.25 },
      { key: "character", name: "Character", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "westernAtmosphere", name: "Western Atmosphere", weight: 0.2 },
      { key: "showdowns", name: "Showdowns", weight: 0.25 },
    ],
  },
  thriller: {
    title: "Thriller",
    questions: [
      { key: "story", name: "Storyline", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "suspense", name: "Suspense", weight: 0.25 },
      { key: "tensionPacing", name: "Tension/Pacing", weight: 0.15 },
    ],
  },
} as const;

export type GenreKey = keyof typeof GENRE_RATING_CONFIGS;
export type RatingQuestion = (typeof GENRE_RATING_CONFIGS)[GenreKey]["questions"][number];
