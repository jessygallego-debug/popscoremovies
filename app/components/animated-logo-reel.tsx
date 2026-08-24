"use client";

import { useEffect, useRef } from "react";
import styles from "@/app/components/animated-logo-reel.module.css";

const REEL_ANIMATION_KEY = "popscore-logo-reel-animation-v1";

export default function AnimatedLogoReel() {
  const stageRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    try {
      if (window.localStorage.getItem(REEL_ANIMATION_KEY)) {
        return;
      }

      window.localStorage.setItem(REEL_ANIMATION_KEY, "played");
    } catch {
      // If browser storage is unavailable, the animation can safely play again.
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      stage.dataset.animate = "true";
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <span ref={stageRef} className={styles.stage} aria-hidden="true">
      <span className={styles.filmStrip}>
        <svg viewBox="0 0 100 100" className={styles.artwork}>
          <path
            d="M 16 76 C -4 88 -27 91 -43 78 C -56 67 -50 52 -35 54"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M 16 76 C -4 88 -27 91 -43 78 C -56 67 -50 52 -35 54"
            fill="none"
            stroke="#111827"
            strokeWidth="6"
            strokeDasharray="4 6"
            strokeLinecap="butt"
          />
        </svg>
      </span>
      <span className={styles.reel}>
        <svg viewBox="0 0 100 100" className={styles.artwork}>
          <circle cx="50" cy="50" r="47" fill="currentColor" />
          <circle cx="50" cy="50" r="9" fill="#111827" />
          <circle cx="50" cy="24" r="12" fill="#111827" />
          <circle cx="74.7" cy="42" r="12" fill="#111827" />
          <circle cx="65.3" cy="71" r="12" fill="#111827" />
          <circle cx="34.7" cy="71" r="12" fill="#111827" />
          <circle cx="25.3" cy="42" r="12" fill="#111827" />
        </svg>
      </span>
    </span>
  );
}
