"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const scoreOptions = [
  {
    value: 1,
    iconSrc: "/rating-icons/burnt.png",
    label: "Burnt",
    description: "Bad",
  },
  {
    value: 2,
    iconSrc: "/rating-icons/salty.png",
    label: "Salty",
    description: "Meh",
  },
  {
    value: 3,
    iconSrc: "/rating-icons/fresh-popcorn.png",
    label: "Fresh Popcorn",
    description: "Good",
  },
  {
    value: 4,
    iconSrc: "/rating-icons/buttery.png",
    label: "Buttery",
    description: "Great",
  },
  {
    value: 5,
    iconSrc: "/rating-icons/extra-buttery.png",
    label: "Extra Buttery",
    description: "Amazing",
  },
];

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
  if (score >= 90) {
    return {
      iconSrc: "/rating-icons/extra-buttery.png",
      label: "Extra Buttery",
    };
  }

  if (score >= 75) {
    return { iconSrc: "/rating-icons/buttery.png", label: "Buttery" };
  }

  if (score >= 60) {
    return {
      iconSrc: "/rating-icons/fresh-popcorn.png",
      label: "Fresh Popcorn",
    };
  }

  if (score >= 40) {
    return { iconSrc: "/rating-icons/salty.png", label: "Salty" };
  }

  return { iconSrc: "/rating-icons/burnt.png", label: "Burnt" };
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
  const router = useRouter();
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
  const exitHref = movieId ? `/movie/${movieId}` : "/";
  const popRating = getPopRating(popScore);

  const handleSubmit = () => {
    if (!movieId || !allAnswered) {
      return;
    }

    savePopScore(movieId, selectedGenre, ratings, currentGenre.questions)
      .then(() => {
        setSubmittedScore(popScore);
        router.push(exitHref);
      })
      .catch(() => setSubmittedScore(null));
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b_0%,#050505_42%,#000_100%)] px-5 py-8 text-white sm:px-8 sm:py-12">
      <section className="relative mx-auto max-w-6xl rounded-3xl border border-white/10 bg-black/60 p-5 shadow-2xl shadow-yellow-400/10 backdrop-blur sm:p-8">
        <Link
          href={exitHref}
          aria-label="Exit rating screen"
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black text-gray-300 transition hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-300"
        >
          X
        </Link>

        <Link
          href="/"
          aria-label="Go to PopScore Movies home"
          className="mb-6 inline-flex items-center gap-2 text-lg font-bold text-yellow-400 transition hover:text-yellow-300"
        >
          <span aria-hidden="true">🍿</span>
          <span>PopScore Movies</span>
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-4xl shadow-lg shadow-yellow-400/20">
            🍿
          </div>
          <h1 className="text-4xl font-black text-white sm:text-6xl">
            Rate This Movie
          </h1>
          <p className="mt-4 text-xl font-bold text-gray-200">
            How did this movie feel overall?
          </p>
        </div>

        {movieTitle ? (
          <p className="mb-8 text-center text-xl font-bold text-yellow-300">
            {movieTitle}
          </p>
        ) : (
          <div className="mb-8" />
        )}

        <div className="mb-10 flex flex-wrap justify-center gap-3">
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
              className="rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black shadow-lg shadow-yellow-400/20"
            >
              {genre.title}
            </button>
          ))}
        </div>

        <div className="space-y-8">
          {currentGenre.questions.map((question) => (
            <div
              key={question.key}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/40 sm:p-6"
            >
              <div className="mb-5 flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white">
                  {question.name}
                </h2>
                <span
                  title={categoryTips[question.key]}
                  aria-label={categoryTips[question.key]}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 text-xs font-bold text-yellow-300"
                >
                  i
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                {scoreOptions.map((option) => {
                  const isSelected = ratings[question.key] === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setRatings({
                          ...ratings,
                          [question.key]: option.value,
                        });
                        setSubmittedScore(null);
                      }}
                      className={`min-h-44 rounded-2xl border p-4 text-center transition ${
                        isSelected
                          ? "border-yellow-300 bg-yellow-400/15 text-yellow-300 shadow-[0_0_34px_rgba(250,204,21,0.35)]"
                          : "border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] text-gray-200 hover:border-yellow-400/60 hover:bg-yellow-400/10"
                      }`}
                    >
                      <span className="relative mx-auto block h-24 w-24 overflow-hidden rounded-2xl">
                        <Image
                          src={option.iconSrc}
                          alt={`${option.label} rating icon`}
                          fill
                          sizes="96px"
                          className="object-contain"
                        />
                      </span>
                      <span className="mt-4 block text-4xl font-black">
                        {option.value}
                      </span>
                      <span className="mt-3 block text-sm font-black">
                        {option.label}
                      </span>
                      <span
                        className={`mx-auto my-4 block h-px w-12 ${
                          isSelected ? "bg-yellow-300/70" : "bg-white/15"
                        }`}
                      />
                      <span className="block text-xs font-bold text-gray-400">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {allAnswered && (
          <div className="mt-10 rounded-3xl border border-yellow-400/40 bg-yellow-400/10 p-8 text-white shadow-xl shadow-yellow-400/20">
            <p className="text-lg font-bold">Your PopScore</p>
            <h2 className="text-6xl font-black text-yellow-300">
              {popScore}%
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <span className="relative block h-20 w-20 overflow-hidden rounded-2xl">
                <Image
                  src={popRating.iconSrc}
                  alt={`${popRating.label} PopScore icon`}
                  fill
                  sizes="80px"
                  className="object-contain"
                />
              </span>
              <p className="text-2xl font-bold text-yellow-200">
                {popRating.label}
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5 text-gray-200">
              <p className="font-bold text-yellow-300">
                ✨ Extra Buttery = Amazing
              </p>
              <p className="mt-2 text-sm">
                You can always come back and leave a full movie rating when
                you&apos;re ready!
              </p>
            </div>

            {movieId ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="mt-6 min-h-14 w-full rounded-2xl bg-yellow-400 px-6 text-lg font-black text-black shadow-[0_0_28px_rgba(250,204,21,0.42)] hover:bg-yellow-300 sm:w-auto"
              >
                Submit Rating ★
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
