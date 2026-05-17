"use client";

import { useState } from "react";
import { AVATAR_OPTIONS } from "@/lib/profile-config";

type AvatarPickerProps = {
  ratedMovieCount: number;
  value: string;
  onChange: (value: string) => void;
};

function pluralizeRatings(count: number) {
  return `${count} movie rating${count === 1 ? "" : "s"}`;
}

export default function AvatarPicker({
  ratedMovieCount,
  value,
  onChange,
}: AvatarPickerProps) {
  const [lockedMessage, setLockedMessage] = useState("");

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {AVATAR_OPTIONS.map((avatar) => {
          const isUnlocked = ratedMovieCount >= avatar.unlockAt;
          const isSelected = value === avatar.key;
          const remainingRatings = Math.max(avatar.unlockAt - ratedMovieCount, 0);
          const isCrown = avatar.key === "crown";

          return (
            <button
              key={avatar.key}
              type="button"
              aria-disabled={!isUnlocked}
              onClick={() => {
                if (!isUnlocked) {
                  setLockedMessage(
                    `${avatar.label} needs ${pluralizeRatings(
                      remainingRatings
                    )} more. Rate ${avatar.unlockAt} movies total to unlock it.`
                  );
                  return;
                }

                setLockedMessage("");
                onChange(avatar.key);
              }}
              className={`group relative min-h-[8.5rem] rounded-2xl border p-3 text-center transition ${
                isSelected
                  ? "border-yellow-300 bg-yellow-400/15 text-yellow-200 shadow-lg shadow-yellow-400/20"
                  : "border-slate-800 bg-slate-950 text-slate-300"
              } ${
                isUnlocked
                  ? "hover:-translate-y-1 hover:border-yellow-400/70 hover:bg-slate-900 hover:text-white hover:shadow-lg hover:shadow-yellow-400/10"
                  : "cursor-pointer opacity-45 grayscale hover:border-slate-600"
              } ${
                isCrown && isUnlocked
                  ? "border-yellow-300/80 bg-yellow-400/15 shadow-yellow-400/25"
                  : ""
              }`}
            >
              {!isUnlocked ? (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-black/80 text-xs">
                  🔒
                </span>
              ) : null}
              {isCrown && isUnlocked ? (
                <span className="pointer-events-none absolute inset-x-4 top-4 h-10 rounded-full bg-yellow-300/20 blur-xl" />
              ) : null}
              <span
                className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border text-3xl transition group-hover:scale-105 ${
                  isUnlocked
                    ? "border-yellow-400/35 bg-black/45 shadow-lg shadow-yellow-400/10"
                    : "border-slate-700 bg-slate-900 text-slate-500"
                } ${
                  isCrown && isUnlocked
                    ? "border-yellow-200 bg-yellow-400/20 shadow-yellow-400/30"
                    : ""
                }`}
              >
                {isUnlocked ? avatar.icon : "🔒"}
              </span>
              <span className="mt-3 block text-xs font-black leading-4">
                {avatar.label}
              </span>
              {!isUnlocked ? (
                <span className="mt-2 block text-[10px] font-bold leading-4 text-slate-400">
                  Rate {avatar.unlockAt} movies to unlock
                </span>
              ) : (
                <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-yellow-300/80">
                  Available
                </span>
              )}
            </button>
          );
        })}
      </div>
      {lockedMessage ? (
        <p className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm font-bold text-yellow-200">
          {lockedMessage}
        </p>
      ) : null}
    </div>
  );
}
