"use client";

import { PROFILE_GENRES } from "@/lib/profile-config";

type FavoriteGenreSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function FavoriteGenreSelector({
  value,
  onChange,
}: FavoriteGenreSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROFILE_GENRES.map((genre) => (
        <button
          key={genre.key}
          type="button"
          onClick={() => onChange(genre.key)}
          className={`rounded-full border px-4 py-2 text-sm font-black transition ${
            value === genre.key
              ? "border-yellow-400 bg-yellow-400 text-black"
              : "border-slate-700 bg-slate-950 text-slate-300 hover:border-yellow-400 hover:text-yellow-300"
          }`}
        >
          {genre.label}
        </button>
      ))}
    </div>
  );
}
