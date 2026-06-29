"use client";

export type Tier = "low" | "mid" | "high";

/**
 * Тиринг по мощности устройства. Аудитория включает дешёвые Android
 * в малых городах — приложение не должно тормозить.
 *   high — полный 3D
 *   mid  — упрощённый 3D
 *   low  — лёгкий режим по умолчанию
 */
export function detectTier(): Tier {
  if (typeof navigator === "undefined") return "high";
  const cores = navigator.hardwareConcurrency || 4;
  // deviceMemory есть не во всех браузерах
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  const isMobile =
    /Mobi|Android/i.test(navigator.userAgent) ||
    (typeof window !== "undefined" && window.matchMedia("(max-width: 780px)").matches);

  if (isMobile) {
    if (cores <= 4 || mem <= 3) return "low"; // дешёвый Android — лёгкий режим
    if (cores >= 8 && mem >= 6) return "high"; // флагман тянет полный 3D
    return "mid";
  }
  // десктоп / ноутбук
  if (cores <= 4 || mem <= 4) return "mid";
  return "high";
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
