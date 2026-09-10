"use client";

import { useEffect, useState } from "react";
import {
  movieWatchDateKey,
  removeUserMovieWatch,
  updateUserMovieWatchDate,
  type UserMovieWatch,
} from "@/lib/profile-store";

type WatchDateEditorProps = {
  allowDelete?: boolean;
  className?: string;
  onChanged?: (watch: UserMovieWatch | null) => void;
  triggerLabel?: string;
  watch: UserMovieWatch;
};

function yesterdayDateKey() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return movieWatchDateKey(yesterday);
}

export default function WatchDateEditor({
  allowDelete = false,
  className = "",
  onChanged,
  triggerLabel = "Change date",
  watch,
}: WatchDateEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    watch.watchedDate ?? movieWatchDateKey()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const saveDate = (watchedDate: string | null) => {
    setIsSaving(true);
    setError("");
    updateUserMovieWatchDate({
      id: watch.id,
      watchedDate,
      watchType: watch.watchType,
    })
      .then((nextWatch) => {
        onChanged?.(nextWatch);
        setIsOpen(false);
      })
      .catch(() => setError("Could not change this watched date. Please try again."))
      .finally(() => setIsSaving(false));
  };

  const removeWatch = () => {
    setIsSaving(true);
    setError("");
    removeUserMovieWatch(watch.id)
      .then(() => {
        onChanged?.(null);
        setIsOpen(false);
      })
      .catch(() => setError("Could not remove this watch. Please try again."))
      .finally(() => setIsSaving(false));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setShowDatePicker(false);
          setSelectedDate(watch.watchedDate ?? movieWatchDateKey());
          setIsOpen(true);
        }}
        className={`text-xs font-black text-yellow-300 underline decoration-yellow-400/50 underline-offset-4 transition hover:text-yellow-200 ${className}`}
      >
        {triggerLabel}
      </button>

      {isOpen ? (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`watch-date-${watch.id}`}
            className="w-full rounded-t-3xl border border-slate-700 bg-[#081020] p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">
                  Movie activity
                </p>
                <h2 id={`watch-date-${watch.id}`} className="mt-1 text-xl font-black text-white">
                  When did you watch it?
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close watched date options"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-300 hover:border-yellow-400 hover:text-yellow-300"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => saveDate(movieWatchDateKey())}
                className="min-h-12 rounded-xl border border-slate-700 bg-black/35 px-4 text-left font-black text-white hover:border-yellow-400 hover:text-yellow-300 disabled:opacity-60"
              >
                Today
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => saveDate(yesterdayDateKey())}
                className="min-h-12 rounded-xl border border-slate-700 bg-black/35 px-4 text-left font-black text-white hover:border-yellow-400 hover:text-yellow-300 disabled:opacity-60"
              >
                Yesterday
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setShowDatePicker(true)}
                className="min-h-12 rounded-xl border border-slate-700 bg-black/35 px-4 text-left font-black text-white hover:border-yellow-400 hover:text-yellow-300 disabled:opacity-60"
              >
                Choose a date
              </button>
              {showDatePicker ? (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-2">
                  <input
                    type="date"
                    aria-label="Watched date"
                    max={movieWatchDateKey()}
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="min-h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 font-bold text-white [color-scheme:dark]"
                  />
                  <button
                    type="button"
                    disabled={isSaving || !selectedDate}
                    onClick={() => saveDate(selectedDate)}
                    className="rounded-lg bg-yellow-400 px-4 font-black text-black disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => saveDate(null)}
                className="min-h-12 rounded-xl border border-slate-700 bg-black/35 px-4 text-left font-black text-white hover:border-yellow-400 hover:text-yellow-300 disabled:opacity-60"
              >
                I watched this previously
              </button>
            </div>

            {allowDelete ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={removeWatch}
                className="mt-4 text-sm font-black text-red-300 hover:text-red-200 disabled:opacity-60"
              >
                Remove watch entry
              </button>
            ) : null}
            {error ? <p className="mt-3 text-sm font-bold text-red-300">{error}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
