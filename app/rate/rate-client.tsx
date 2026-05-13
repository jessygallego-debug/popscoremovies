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
    iconSrc: "/rating-icons/extra-buttery-v2.png",
    label: "Extra Buttery",
    description: "Amazing",
  },
];

const categoryTips: Record<string, string> = {
  actionSequences: "Stunts, fights, chases, and big moments.",
  acting: "How believable the performances feel.",
  animationQuality: "How strong the animation looks and moves.",
  battleScenes: "How powerful and clear the battle scenes feel.",
  chemistry: "How well the leads connect on screen.",
  choreography: "How well the dance and movement land.",
  conflict: "How strong the central struggle feels.",
  emotionalImpact: "How much the movie makes you feel.",
  excitement: "How fun and thrilling the journey feels.",
  exploration: "How strong the sense of discovery feels.",
  familyEnjoyment: "How well it works for family viewing.",
  heartWarmth: "How warm and heartfelt the movie feels.",
  humor: "How often the jokes land.",
  impact: "How much the documentary stays with you.",
  informativeValue: "How much you learn from it.",
  intrigue: "How well it keeps you curious.",
  mysteryPayoff: "How satisfying the answers feel.",
  originality: "How fresh or unique the movie feels.",
  pace: "How well the movie keeps moving.",
  quotability: "How memorable the funny lines are.",
  rewatchability: "How likely you are to watch it again.",
  scareFactor: "How tense, scary, or unsettling it feels.",
  songQuality: "How memorable and enjoyable the songs are.",
  story: "How strong the plot and characters are.",
  suspense: "How well the movie keeps you on edge.",
  tension: "How well suspense builds and holds.",
  tensionPacing: "How well tension and momentum build.",
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
  returnTo?: string;
  submitReturnTo?: string;
};

function getPopRating(score: number) {
  if (score >= 90) {
    return {
      iconSrc: "/rating-icons/extra-buttery-v2.png",
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
  returnTo = "/",
  submitReturnTo,
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
  const detailExitHref = movieId
    ? `/movie/${movieId}?returnTo=${encodeURIComponent(returnTo)}`
    : returnTo;
  const exitHref = submitReturnTo ?? detailExitHref;
  const submitHref = submitReturnTo ?? detailExitHref;
  const popRating = getPopRating(popScore);

  const handleSubmit = () => {
    if (!movieId || !allAnswered) {
      return;
    }

    savePopScore(movieId, selectedGenre, ratings, currentGenre.questions)
      .then(() => {
        setSubmittedScore(popScore);
        router.push(submitHref);
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

        <div className="mb-5 text-center sm:mb-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10 text-3xl shadow-lg shadow-yellow-400/20 sm:mb-4 sm:h-16 sm:w-16 sm:text-4xl">
            🍿
          </div>
          <h1 className="text-3xl font-black text-white sm:text-6xl">
            Rate This Movie
          </h1>
          <p className="mt-3 text-base font-bold text-gray-200 sm:mt-4 sm:text-xl">
            How did this movie feel overall?
          </p>
        </div>

        {movieTitle ? (
          <p className="mb-5 text-center text-base font-bold text-yellow-300 sm:mb-8 sm:text-xl">
            {movieTitle}
          </p>
        ) : (
          <div className="mb-5 sm:mb-8" />
        )}

        <div className="mb-6 flex flex-wrap justify-center gap-3 sm:mb-10">
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

        <div className="space-y-4 sm:space-y-8">
          {currentGenre.questions.map((question) => (
            <div
              key={question.key}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-xl shadow-black/40 sm:rounded-3xl sm:p-6"
            >
              <div className="mb-3 flex items-center gap-2 sm:mb-5">
                <h2 className="text-lg font-bold text-white sm:text-2xl">
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

              <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                {scoreOptions.map((option) => {
                  const isSelected = ratings[question.key] === option.value;
                  const imageSize =
                    option.value === 5
                      ? "h-12 w-12 sm:h-28 sm:w-28"
                      : "h-9 w-9 sm:h-20 sm:w-20";

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
                      className={`flex min-h-24 flex-col items-center rounded-xl border p-1.5 text-center transition sm:min-h-44 sm:rounded-2xl sm:p-4 ${
                        isSelected
                          ? "border-yellow-300 bg-yellow-400/15 text-yellow-300 shadow-[0_0_34px_rgba(250,204,21,0.35)]"
                          : "border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] text-gray-200 hover:border-yellow-400/60 hover:bg-yellow-400/10"
                      }`}
                    >
                      <span className="flex h-12 w-full items-center justify-center sm:h-28">
                        <span
                          className={`relative block overflow-hidden rounded-lg sm:rounded-2xl ${imageSize}`}
                        >
                          <Image
                            src={option.iconSrc}
                            alt={`${option.label} rating icon`}
                            fill
                            sizes={
                              option.value === 5
                                ? "(min-width: 640px) 112px, 48px"
                                : "(min-width: 640px) 80px, 36px"
                            }
                            className="object-contain"
                          />
                        </span>
                      </span>
                      <span className="mt-1 block text-lg font-black sm:mt-4 sm:text-4xl">
                        {option.value}
                      </span>
                      <span className="mt-1 block text-[9px] font-black leading-tight sm:mt-3 sm:text-sm">
                        {option.label}
                      </span>
                      <span
                        className={`mx-auto my-1.5 block h-px w-8 sm:my-4 sm:w-12 ${
                          isSelected ? "bg-yellow-300/70" : "bg-white/15"
                        }`}
                      />
                      <span className="block text-[9px] font-bold leading-tight text-gray-400 sm:text-xs">
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
              <span className="relative block h-20 w-20 overflow-hidden rounded-full border border-yellow-300/40 bg-yellow-400/10 shadow-[0_0_24px_rgba(250,204,21,0.25)]">
                <Image
                  src="/rating-icons/extra-buttery-v2.png"
                  alt="Extra Buttery PopScore icon"
                  fill
                  sizes="80px"
                  className="object-cover"
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
