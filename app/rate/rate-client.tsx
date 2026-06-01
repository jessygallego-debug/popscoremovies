"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MoviePosterImage from "@/app/components/movie-poster-image";
import ProfileMenu from "@/app/components/profile-menu";
import {
  getCurrentProfile,
  removeFromWatchlist,
  saveUserMovieRating,
} from "@/lib/profile-store";
import { posterUrl } from "@/lib/tmdb";
import {
  GENRE_RATING_CONFIGS,
  type GenreKey as RatingGenreKey,
} from "@/lib/genre-rating-config";
import { notifyPopScoreUpdates, ratingToPercent } from "@/lib/popscore-store";
import {
  REVIEW_COMMENT_MAX_LENGTH,
  validateReviewComment,
} from "@/lib/review-comments";

const genreConfigs = GENRE_RATING_CONFIGS;

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
  character: "How memorable the characters are.",
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
  showdowns: "How exciting the confrontations feel.",
  songQuality: "How memorable and enjoyable the songs are.",
  story: "How strong the plot and characters are.",
  suspense: "How well the movie keeps you on edge.",
  tension: "How well suspense builds and holds.",
  tensionPacing: "How well tension and momentum build.",
  visualEffects: "How convincing the effects look.",
  voiceActing: "How well the voices bring characters to life.",
  westernAtmosphere: "How well it captures the Western setting, tone, and feel.",
};

export type GenreKey = RatingGenreKey;

type GenreEntry = [GenreKey, (typeof genreConfigs)[GenreKey]];

type RateClientProps = {
  movieId?: string;
  movieGenreNames?: string[];
  moviePosterPath?: string | null;
  movieReleaseDate?: string | null;
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
      description: "Amazing",
    };
  }

  if (score >= 75) {
    return {
      iconSrc: "/rating-icons/buttery.png",
      label: "Buttery",
      description: "Great",
    };
  }

  if (score >= 60) {
    return {
      iconSrc: "/rating-icons/fresh-popcorn.png",
      label: "Fresh Popcorn",
      description: "Good",
    };
  }

  if (score >= 40) {
    return {
      iconSrc: "/rating-icons/salty.png",
      label: "Salty",
      description: "Meh",
    };
  }

  return {
    iconSrc: "/rating-icons/burnt.png",
    label: "Burnt",
    description: "Bad",
  };
}

export function isGenreKey(value: string | undefined): value is GenreKey {
  return Boolean(value && value in genreConfigs);
}

function movieReleaseYear(value?: string | null) {
  return value?.split("-")[0] ?? "";
}

export default function RateClient({
  movieId,
  movieGenreNames,
  moviePosterPath,
  movieReleaseDate,
  initialGenre,
  lockGenre,
  movieTitle,
  returnTo = "/",
  submitReturnTo,
}: RateClientProps) {
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState<GenreKey>(initialGenre);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [reviewComment, setReviewComment] = useState("");
  const [reviewCommentError, setReviewCommentError] = useState("");
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [submitMessage, setSubmitMessage] = useState("");

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
  const moviePosterSrc = posterUrl(moviePosterPath ?? null);
  const releaseYear = movieReleaseYear(movieReleaseDate);

  const handleSubmit = () => {
    if (!movieId || !allAnswered) {
      return;
    }

    const reviewValidation = validateReviewComment(reviewComment);

    if (reviewValidation.error) {
      setReviewCommentError(reviewValidation.error);
      setSubmitMessage("");
      return;
    }

    setReviewCommentError("");
    setSubmitMessage("");

    getCurrentProfile()
      .then((profile) => {
        if (!profile) {
          setSubmitMessage(
            "Create or sign in to your PopFile before rating movies."
          );
          return Promise.reject(new Error("Missing profile"));
        }

        return saveUserMovieRating({
          genre: selectedGenre,
          movie: {
            genreNames: movieGenreNames ?? [],
            movieId,
            movieTitle: movieTitle ?? `Movie ${movieId}`,
            posterPath: moviePosterPath,
            releaseDate: movieReleaseDate,
          },
          popscore: popScore,
          questions: currentGenre.questions,
          ratings,
          reviewComment: reviewValidation.reviewComment ?? "",
        });
      })
      .then(() => {
        notifyPopScoreUpdates();
        return removeFromWatchlist(movieId).catch(() => null);
      })
      .then(() => {
        setSubmittedScore(popScore);
        router.push(submitHref);
      })
      .catch((error: Error) => {
        if (error.message !== "Missing profile") {
          setSubmittedScore(null);
          setSubmitMessage(
            error.message === "Please keep comments clean before submitting."
              ? error.message
              : error.message.includes("review_comment")
                ? "Review comments need the latest database update before submitting."
              : "Could not submit rating. Please try again."
          );
        }
      });
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

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 pr-12">
          <Link
            href="/"
            aria-label="Go to PopScore Movies home"
            className="inline-flex items-center gap-2 text-lg font-bold text-yellow-400 transition hover:text-yellow-300"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-yellow-400/10"
            >
              <span className="relative block h-6 w-6">
                <Image
                  src="/rating-icons/extra-buttery-v2.png"
                  alt=""
                  fill
                  sizes="24px"
                  className="object-contain"
                />
              </span>
            </span>
            <span>PopScore Movies</span>
          </Link>

          <ProfileMenu />
        </div>

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
          <div className="mb-5 flex flex-col items-center justify-center gap-3 text-center sm:mb-8 sm:flex-row sm:gap-4">
            {movieId ? (
              <Link
                href={detailExitHref}
                aria-label={`View ${movieTitle}`}
                className="group relative block h-28 w-[74px] overflow-hidden rounded-xl border border-yellow-400/35 bg-slate-950 shadow-xl shadow-black/40 transition hover:-translate-y-0.5 hover:border-yellow-300/80 sm:h-32 sm:w-[86px]"
              >
                <MoviePosterImage
                  src={moviePosterSrc}
                  alt={`${movieTitle} poster`}
                  sizes="(min-width: 640px) 86px, 74px"
                  className="object-cover transition group-hover:scale-105"
                  fallbackMovieId={movieId}
                  unoptimized
                />
              </Link>
            ) : null}
            <div>
              <p className="text-base font-bold text-yellow-300 sm:text-xl">
                {movieTitle}
              </p>
              {releaseYear ? (
                <p className="mt-1 text-xs font-bold text-slate-400 sm:text-sm">
                  {releaseYear}
                </p>
              ) : null}
            </div>
          </div>
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

        <div className="space-y-3 sm:space-y-5">
          {currentGenre.questions.map((question) => (
            <div
              key={question.key}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-xl shadow-black/40 sm:p-4"
            >
              <div className="mb-2 flex items-center gap-2 sm:mb-3">
                <h2 className="text-base font-bold text-white sm:text-xl">
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

              <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                {scoreOptions.map((option) => {
                  const isSelected = ratings[question.key] === option.value;
                  const imageSize =
                    option.value === 5
                      ? "h-10 w-10 sm:h-20 sm:w-20"
                      : "h-8 w-8 sm:h-14 sm:w-14";

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
                      className={`flex min-h-20 flex-col items-center rounded-xl border p-1.5 text-center transition sm:min-h-32 sm:p-3 ${
                        isSelected
                          ? "border-yellow-300 bg-yellow-400/15 text-yellow-300 shadow-[0_0_34px_rgba(250,204,21,0.35)]"
                          : "border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] text-gray-200 hover:border-yellow-400/60 hover:bg-yellow-400/10"
                      }`}
                    >
                      <span className="flex h-10 w-full items-center justify-center sm:h-20">
                        <span
                          className={`relative block overflow-hidden rounded-lg ${imageSize}`}
                        >
                          <Image
                            src={option.iconSrc}
                            alt={`${option.label} rating icon`}
                            fill
                            unoptimized
                            sizes={
                              option.value === 5
                                ? "(min-width: 640px) 80px, 40px"
                                : "(min-width: 640px) 56px, 32px"
                            }
                            className="object-contain"
                          />
                        </span>
                      </span>
                      <span className="mt-0.5 block text-base font-black sm:mt-2 sm:text-3xl">
                        {option.value}
                      </span>
                      <span className="mt-0.5 block text-[9px] font-black leading-tight sm:mt-1.5 sm:text-xs">
                        {option.label}
                      </span>
                      <span
                        className={`mx-auto my-1 block h-px w-7 sm:my-2 sm:w-10 ${
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
          <div className="mt-6 rounded-3xl border border-yellow-400/40 bg-yellow-400/10 p-4 text-white shadow-xl shadow-yellow-400/20 sm:p-6">
            <p className="text-base font-bold sm:text-lg">Your PopScore</p>
            <h2 className="text-5xl font-black text-yellow-300 sm:text-6xl">
              {popScore}%
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="relative block h-16 w-16 overflow-hidden rounded-full border border-yellow-300/40 bg-yellow-400/10 shadow-[0_0_24px_rgba(250,204,21,0.25)] sm:h-20 sm:w-20">
                <Image
                  src={popRating.iconSrc}
                  alt={`${popRating.label} PopScore icon`}
                  fill
                  sizes="80px"
                  className="object-contain"
                />
              </span>
              <p className="text-xl font-bold text-yellow-200 sm:text-2xl">
                {popRating.label}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-gray-200">
              <p className="font-bold text-yellow-300">
                {popRating.label} = {popRating.description}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-yellow-400/30 bg-black/40 p-4 shadow-inner shadow-yellow-400/10">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-yellow-300">
                    💬 Optional Review Comment
                  </h3>
                  <p className="mt-1 text-sm font-bold text-gray-300">
                    What stood out about this movie? (Optional)
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-400">
                  {reviewComment.length} / {REVIEW_COMMENT_MAX_LENGTH} characters
                </span>
              </div>
              <textarea
                value={reviewComment}
                maxLength={REVIEW_COMMENT_MAX_LENGTH}
                onChange={(event) => {
                  setReviewComment(event.target.value);
                  setReviewCommentError("");
                  setSubmitMessage("");
                }}
                placeholder="Share your thoughts..."
                className="mt-3 min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-gray-500 focus:border-yellow-400/60 focus:bg-yellow-400/5 focus:shadow-[0_0_22px_rgba(250,204,21,0.18)]"
              />
              <p className="mt-2 text-xs font-bold text-gray-400">
                Please keep comments respectful and spoiler-free.
              </p>
              {reviewCommentError ? (
                <p className="mt-2 text-sm font-black text-yellow-200">
                  {reviewCommentError}
                </p>
              ) : null}
            </div>

            {movieId ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="mt-5 min-h-14 w-full rounded-2xl bg-yellow-400 px-6 text-lg font-black text-black shadow-[0_0_28px_rgba(250,204,21,0.42)] hover:bg-yellow-300 sm:w-auto"
              >
                Submit Rating ★
              </button>
            ) : (
              <p className="mt-6 font-bold">
                Select a movie before submitting a rating.
              </p>
            )}

            {submitMessage ? (
              <p className="mt-4 font-bold text-yellow-200">{submitMessage}</p>
            ) : null}

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
