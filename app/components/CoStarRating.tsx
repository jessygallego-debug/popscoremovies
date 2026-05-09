"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type CoStarOption = {
  label: string;
  rating: string;
  score: number;
};

const coStarOptions: CoStarOption[] = [
  { label: "🧈🧈🍿 Extra Buttery", rating: "Fantastic", score: 100 },
  { label: "🧈🍿 Buttery", rating: "Great", score: 85 },
  { label: "🍿 Fresh Popcorn", rating: "Good", score: 70 },
  { label: "🧂 Salty", rating: "Bad", score: 45 },
  { label: "💨 Burnt", rating: "Really Bad", score: 15 },
];

type CoStarRatingProps = {
  children?: ReactNode;
};

export default function CoStarRating({ children }: CoStarRatingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CoStarOption | null>(
    null
  );
  const [submittedOption, setSubmittedOption] = useState<CoStarOption | null>(
    null
  );

  const handleSubmit = () => {
    if (!selectedOption) {
      return;
    }

    setSubmittedOption(selectedOption);
    setIsOpen(false);
  };

  return (
    <div>
      <p className="font-bold text-yellow-400">
        {submittedOption
          ? `Co-Star Score: ${submittedOption.score}%`
          : "Co-Star Score: Not rated yet"}
      </p>

      {submittedOption ? (
        <div className="mt-4 rounded-lg border border-yellow-400/40 bg-yellow-400/10 p-4 text-yellow-100">
          <p className="font-bold">Thanks for Co-Starring 🍿</p>
          <p className="mt-1 text-sm text-gray-200">
            Your reaction: {submittedOption.label}
          </p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {children}

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-yellow-400 px-6 font-bold text-yellow-400 hover:bg-yellow-400 hover:text-black"
        >
          Co-Star Rate
        </button>
      </div>

      {isOpen ? (
        <div
          aria-modal="true"
          role="dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-5 py-8"
        >
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Quick Co-Star Rating
                </h2>
                <p className="mt-2 text-gray-300">
                  How did this movie feel overall?
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Co-Star rating"
                className="rounded-lg px-3 py-2 font-bold text-gray-400 hover:bg-gray-900 hover:text-white"
              >
                X
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {coStarOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setSelectedOption(option)}
                  className={`rounded-lg border p-4 text-left font-bold transition ${
                    selectedOption?.label === option.label
                      ? "border-yellow-400 bg-yellow-400 text-black"
                      : "border-gray-700 bg-black text-white hover:border-yellow-400"
                  }`}
                >
                  <span>{option.label}</span>
                  <span className="float-right">{option.rating}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedOption}
                className="min-h-12 rounded-lg bg-yellow-400 px-6 font-bold text-black hover:bg-yellow-300 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
              >
                Submit
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-h-12 rounded-lg bg-gray-900 px-6 font-bold text-white hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
