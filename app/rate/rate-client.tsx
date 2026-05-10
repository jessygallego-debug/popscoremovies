"use client";

import Link from "next/link";
import { useState } from "react";
import { ratingToPercent, savePopScore } from "@/lib/popscore-store";

const genreConfigs = {
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
};

const scoreLabels = ["Bad", "Meh", "Good", "Great", "Fantastic"];

const categoryTips: Record<string, string> = {
  actionSequences: "Stunts, fights, chases, and big moments.",
  acting: "How believable the performances feel.",
  animationQuality: "How strong the animation looks and moves.",
  chemistry: "How well the leads connect on screen.",
  choreography: "How well the dance and movement land.",
  conflict: "How strong the central struggle feels.",
  emotionalImpact: "How much the movie makes you feel.",
  humor: "How often the jokes land.",
  originality: "How fresh or unique the movie feels.",
  pace: "How well the movie keeps moving.",
  quotability: "How memorable the funny lines are.",
  rewatchability: "How likely you are to watch it again.",
  scareFactor: "How tense, scary, or unsettling it feels.",
  songQuality: "How memorable and enjoyable the songs are.",
  story: "How strong the plot and characters are.",
  tension: "How well suspense builds and holds.",
  visualEffects: "How convincing the effects look.",
  voiceActing: "How well the voices bring characters to life.",
};

export type GenreKey = keyof typeof genreConfigs;

type GenreEntry = [GenreKey, (typeof genreConfigs)[GenreKey]];

type RateClientProps = {
  movieId?: string;
  initialGenre: GenreKey;
  lockGenre: boolean;
  movieTitle?: string;
};

function getPopRating(score: number) {
  if (score >= 90) return "Extra Buttery 🧈🧈🍿";
  if (score >= 75) return "Buttery 🧈🍿";
  if (score >= 60) return "Fresh Popcorn 🍿";
  if (score >= 40) return "Salty 🧂";
  return "Burnt 💨";
}

export function isGenreKey(value: string | undefined): value is GenreKey {
  return Boolean(value && value in genreConfigs);
}

export default function RateClient({
  movieId,
  initialGenre,
  lockGenre,
  movieTitle,
}: RateClientProps) {
  const [selectedGenre, setSelectedGenre] = useState<GenreKey>(initialGenre);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);

  const currentGenre = genreConfigs[selectedGenre];
  const allAnswered = currentGenre.questions.every((q) => ratings[q.key]);

  const popScore = Math.round(
    currentGenre.questions.reduce((total, question) => {
      const rating = ratings[question.key] || 0;
      return total + question.weight * ratingToPercent(rating);
    }, 0) * 100
  );

  const genresToShow: GenreEntry[] = lockGenre
    ? [[selectedGenre, currentGenre]]
    : (Object.entries(genreConfigs) as GenreEntry[]);

  const handleSubmit = () => {
    if (!movieId || !allAnswered) {
      return;
    }

    savePopScore(movieId, selectedGenre, ratings, currentGenre.questions)
      .then(() => setSubmittedScore(popScore))
      .catch(() => setSubmittedScore(null));
  };

  return (
    <main className="min-h-screen bg-black text-white px-8 py-12">
      <section className="max-w-3xl mx-auto">
        <Link
          href="/"
          aria-label="Go to PopScore Movies home"
          className="mb-3 inline-flex items-center gap-2 font-bold text-yellow-400 transition hover:text-yellow-300"
        >
          <span aria-hidden="true">🍿</span>
          <span>PopScore Movies</span>
        </Link>

        <h1 className="text-5xl font-black mb-3">Rate This Movie</h1>

        {movieTitle ? (
          <p className="mb-8 text-xl text-gray-300">{movieTitle}</p>
        ) : (
          <div className="mb-8" />
        )}

        <div className="flex gap-3 flex-wrap mb-10">
          {genresToShow.map(([key, genre]) => (
            <button
              key={key}
              onClick={() => {
                if (!lockGenre) {
                  setSelectedGenre(key);
                  setRatings({});
                  setSubmittedScore(null);
                }
              }}
              className="px-5 py-3 rounded-xl font-bold bg-yellow-400 text-black"
            >
              {genre.title}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {currentGenre.questions.map((question) => (
            <div
              key={question.key}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-2xl font-bold">{question.name}</h2>
                <span
                  title={categoryTips[question.key]}
                  aria-label={categoryTips[question.key]}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-700 text-xs font-bold text-gray-300"
                >
                  i
                </span>
              </div>

              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((score) => (
                  <div key={score} className="flex w-14 flex-col items-center">
                    <button
                      onClick={() => {
                        setRatings({
                          ...ratings,
                          [question.key]: score,
                        });
                        setSubmittedScore(null);
                      }}
                      className={`h-12 w-12 rounded-full font-bold ${
                        ratings[question.key] === score
                          ? "bg-yellow-400 text-black"
                          : "bg-gray-800 hover:bg-yellow-400 hover:text-black"
                      }`}
                    >
                      {score}
                    </button>
                    <span className="mt-2 text-center text-xs font-bold text-gray-400">
                      {scoreLabels[score - 1]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {allAnswered && (
          <div className="mt-10 rounded-2xl bg-yellow-400 text-black p-8">
            <p className="text-lg font-bold">Your PopScore</p>
            <h2 className="text-6xl font-black">{popScore}%</h2>
            <p className="text-2xl font-bold mt-2">{getPopRating(popScore)}</p>

            {movieId ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="mt-6 min-h-12 rounded-lg bg-black px-6 font-bold text-yellow-400 hover:bg-gray-900"
              >
                Submit Rating
              </button>
            ) : (
              <p className="mt-6 font-bold">
                Select a movie before submitting a rating.
              </p>
            )}

            {submittedScore ? (
              <p className="mt-4 font-bold">
                Rating submitted. This movie&apos;s PopScore is now updated.
              </p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
