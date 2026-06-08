"use client";

import { useEffect, useId, useRef, useState } from "react";

type RatingInfoPopoverProps = {
  description: string;
  title: string;
};

export default function RatingInfoPopover({
  description,
  title,
}: RatingInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useId();
  const titleId = `${popoverId}-title`;
  const descriptionId = `${popoverId}-description`;
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        aria-controls={popoverId}
        aria-expanded={isOpen}
        aria-label={`Learn more about ${title}`}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-yellow-400/40 bg-yellow-400/10 text-xs font-black text-yellow-300 outline-none transition hover:border-yellow-300 hover:bg-yellow-400/20 focus-visible:border-yellow-200 focus-visible:ring-2 focus-visible:ring-yellow-300/60"
      >
        i
      </button>

      {isOpen ? (
        <span
          id={popoverId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="absolute left-1/2 top-8 z-50 block w-[min(17rem,calc(100vw-3rem))] -translate-x-1/2 rounded-2xl border border-yellow-400/35 bg-slate-950/95 p-4 text-left shadow-2xl shadow-black/70 outline outline-1 outline-white/5 backdrop-blur motion-safe:animate-[ratingInfoIn_160ms_ease-out] sm:left-0 sm:w-80 sm:translate-x-0"
        >
          <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-yellow-400/35 bg-slate-950 sm:left-3 sm:translate-x-0" />
          <span
            id={titleId}
            className="relative block text-sm font-black text-yellow-300"
          >
            {title}
          </span>
          <span
            id={descriptionId}
            className="relative mt-2 block text-xs font-semibold leading-5 text-slate-200 sm:text-sm sm:leading-6"
          >
            {description}
          </span>
        </span>
      ) : null}
    </span>
  );
}
