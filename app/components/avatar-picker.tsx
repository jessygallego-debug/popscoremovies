"use client";

import { AVATAR_OPTIONS } from "@/lib/profile-config";

type AvatarPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {AVATAR_OPTIONS.map((avatar) => (
        <button
          key={avatar.key}
          type="button"
          onClick={() => onChange(avatar.key)}
          className={`rounded-2xl border p-4 text-center transition ${
            value === avatar.key
              ? "border-yellow-400 bg-yellow-400/15 text-yellow-300"
              : "border-slate-800 bg-slate-950 text-slate-300 hover:border-yellow-400/60"
          }`}
        >
          <span className="block text-3xl">{avatar.icon}</span>
          <span className="mt-2 block text-xs font-bold">{avatar.label}</span>
        </button>
      ))}
    </div>
  );
}
