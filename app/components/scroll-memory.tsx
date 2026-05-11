"use client";

import { useEffect } from "react";

const SCROLL_MEMORY_KEY = "popscore-home-scroll";

type ScrollMemory = {
  path: string;
  y: number;
};

function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

export default function ScrollMemory() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const saved = window.sessionStorage.getItem(SCROLL_MEMORY_KEY);
    const navigation = window.performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;
    const isRefresh = navigation?.type === "reload";

    if (isRefresh) {
      window.sessionStorage.removeItem(SCROLL_MEMORY_KEY);
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0 });
      });
    } else if (saved) {
      try {
        const memory = JSON.parse(saved) as ScrollMemory;

        if (memory.path === currentPath()) {
          window.requestAnimationFrame(() => {
            window.scrollTo({ top: memory.y });
          });
        }
      } catch {
        window.sessionStorage.removeItem(SCROLL_MEMORY_KEY);
      }
    }

    const rememberScroll = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("[data-remember-scroll]");

      if (!link) {
        return;
      }

      const memory: ScrollMemory = {
        path: currentPath(),
        y: window.scrollY,
      };

      window.sessionStorage.setItem(SCROLL_MEMORY_KEY, JSON.stringify(memory));
    };

    document.addEventListener("click", rememberScroll);

    return () => {
      document.removeEventListener("click", rememberScroll);
    };
  }, []);

  return null;
}
