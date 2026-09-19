"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function MovieReviewComment({ text }: { text: string }) {
  const id = useId();
  const paragraph = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const element = paragraph.current;
    if (!element) return;
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      setCanExpand(element.scrollHeight > lineHeight * 2 + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className="mt-3 sm:mt-4">
      <p
        id={id}
        ref={paragraph}
        className={`break-words text-sm font-semibold leading-6 text-gray-200 sm:text-base ${expanded ? "" : "line-clamp-2 sm:line-clamp-none"}`}
      >
        {text}
      </p>
      {canExpand ? (
        <button
          type="button"
          aria-controls={id}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="min-h-9 text-xs font-black text-yellow-300 hover:text-yellow-200 sm:hidden"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
