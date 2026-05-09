"use client";

import Link from "next/link";
import { useState } from "react";

const genreConfigs = {
  horror: {
    title: "Horror",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "scareFactor", name: "Scare Factor", weight: 0.25 },
      { key: "originality", name: "Originality", weight: 0.15 },
    ],
  },
  scifi: {
    title: "Sci-Fi",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "visualEffects", name: "Visual Effects", weight: 0.3 },
      { key: "originality", name: "Originality", weight: 0.1 },
    ],
  },
  action: {
    title: "Action",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "actionSequences", name: "Action Sequences", weight: 0.3 },
      { key: "pace", name: "Pace", weight: 0.1 },
    ],
  },
  comedy: {
    title: "Comedy",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "humor", name: "Humor", weight: 0.3 },
      { key: "quotability", name: "Quotability", weight: 0.1 },
    ],
  },
  romcom: {
    title: "Rom-Com",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "chemistry", name: "Chemistry", weight: 0.25 },
      { key: "humor", name: "Humor", weight: 0.15 },
    ],
  },
  animated: {
    title: "Animated",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "voiceActing", name: "Voice Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "animationQuality", name: "Animation Quality", weight: 0.25 },
      { key: "emotionalImpact", name: "Emotional Impact", weight: 0.15 },
    ],
  },
  musical: {
    title: "Musical",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "songQuality", name: "Song Quality", weight: 0.25 },
      { key: "choreography", name: "Choreography", weight: 0.15 },
    ],
  },
  drama: {
    title: "Drama",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatch Score", weight: 0.1 },
      { key: "conflict", name: "Conflict", weight: 0.2 },
      { key: "tension", name: "Tension", weight: 0.2 },
    ],
  },
};

export type GenreKey = keyof typeof genreConfigs;

type GenreEntry = [GenreKey, (typeof genreConfigs)[GenreKey]];

type RateClientProps = {
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
  initialGenre,
  lockGenre,
  movieTitle,
}: RateClientProps) {
  const [selectedGenre, setSelectedGenre] = useState<GenreKey>(initialGenre);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const currentGenre = genreConfigs[selectedGenre];
  const allAnswered = currentGenre.questions.every((q) => ratings[q.key]);

  const popScore = Math.round(
    currentGenre.questions.reduce((total, question) => {
      const rating = ratings[question.key] || 0;
      return total + question.weight * (rating / 5);
    }, 0) * 100
  );

  const genresToShow: GenreEntry[] = lockGenre
    ? [[selectedGenre, currentGenre]]
    : (Object.entries(genreConfigs) as GenreEntry[]);

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
              <h2 className="text-2xl font-bold mb-4">{question.name}</h2>

              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() =>
                      setRatings({
                        ...ratings,
                        [question.key]: score,
                      })
                    }
                    className={`h-12 w-12 rounded-full font-bold ${
                      ratings[question.key] === score
                        ? "bg-yellow-400 text-black"
                        : "bg-gray-800 hover:bg-yellow-400 hover:text-black"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {allAnswered && (
          <div className="mt-10 rounded-2xl bg-yellow-400 text-black p-8">
            <p className="text-lg font-bold">Your PopScore</p>
            <h2 className="text-6xl font-black">{popScore}</h2>
            <p className="text-2xl font-bold mt-2">{getPopRating(popScore)}</p>
          </div>
        )}
      </section>
    </main>
  );
}
