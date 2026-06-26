"use client";

import * as React from "react";

/**
 * SSR-безопасный matchMedia-хук. На сервере возвращает `false`, реальное
 * значение применяется после маунта (без hydration-mismatch).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const on = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);

  return matches;
}

/** Телефон: < 768px. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/** Планшет: 768–1023px. */
export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}
