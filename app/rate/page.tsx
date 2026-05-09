"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

const genreConfigs = {
  horror: {
    title: "Horror",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatchability", weight: 0.1 },
      { key: "scareFactor", name: "Scare Factor", weight: 0.25 },
      { key: "originality", name: "Originality", weight: 0.15 },
    ],
  },
  scifi: {
    title: "Sci-Fi",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatchability", weight: 0.1 },
      { key: "visualEffects", name: "Visual Effects", weight: 0.3 },
      { key: "originality", name: "Originality", weight: 0.1 },
    ],
  },
  action: {
    title: "Action",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatchability", weight: 0.1 },
      { key: "actionSequences", name: "Action Sequences", weight: 0.3 },
      { key: "pace", name: "Pace", weight: 0.1 },
    ],
  },
  comedy: {
    title: "Comedy",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatchability", weight: 0.1 },
      { key: "humor", name: "Humor", weight: 0.3 },
      { key: "quotability", name: "Quotability", weight: 0.1 },
    ],
  },
  romcom: {
    title: "Rom-Com",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "acting", name: "Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatchability", weight: 0.1 },
      { key: "chemistry", name: "Chemistry", weight: 0.25 },
      { key: "humor", name: "Humor", weight: 0.15 },
    ],
  },
  animated: {
    title: "Animated",
    questions: [
      { key: "story", name: "Story", weight: 0.3 },
      { key: "voiceActing", name: "Voice Acting", weight: 0.2 },
      { key: "rewatchability", name: "Rewatchability", weight: 0.1 },
      { key: "animationQuality", name: "Animation Quality", weight: 0.25 },
      { key: "emotionalImpact", name: "Emotional Impact", weight: 0.15 },
    ],
  },
};

function getPopRating(score: number) {
  if (score >= 90) return "Extra Buttery 🧈🧈🍿";
  if (score >= 75) return "Buttery 🧈🍿";
  if (score >= 60) return "Fresh Popcorn 🍿";
  if (score >= 40) return "Salty 🧂";
  return "Burnt 💨";
}

export default function RatePage() {
  const searchParams = useSearchParams();
  const genreFromUrl = searchParams.get("genre") as keyof typeof genreConfigs | null;

  const startingGenre =
    genreFromUrl && genreConfigs[genreFromUrl] ? genreFromUrl : "horror";

  const shouldLockGenre = Boolean(genreFromUrl && genreConfigs[genreFromUrl]);

  const [selectedGenre, setSelectedGenre] =
    useState<keyof typeof genreConfigs>(startingGenre);

  const [ratings, setRatings] = useState<Record<string, number>>({});

  const currentGenre = genreConfigs[selectedGenre];

  const allAnswered = currentGenre.questions.every((q) => ratings[q.key]);

  const popScore = Math.round(
    currentGenre.questions.reduce((total, question) => {
      const rating = ratings[question.key] || 0;
      return total + question.weight * (rating / 5);
    }, 0) * 100
  );

  const genresToShow = shouldLockGenre
    ? [[selectedGenre, currentGenre]]
    : Object.entries(genreConfigs);

  return (
    <main className="min-h-screen bg-black text-white px-8 py-12">
      <section className="max-w-3xl mx-auto">
        <p className="text-yellow-400 font-bold mb-3">🍿 PopScore Rating</p>

        <h1 className="text-5xl font-black mb-8">Rate This Movie</h1>

        <div className="flex gap-3 flex-wrap mb-10">
          {genresToShow.map(([key, genre]) => (
            <button
              key={key}
              onClick={() => {
                if (!shouldLockGenre) {
                  setSelectedGenre(key as keyof typeof genreConfigs);
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