/**
 * Хэптика — тактильный слой поверх звука (mobile-first).
 * navigator.vibrate: Android/Chrome — работает, iOS Safari — тихий no-op.
 * Только СМЫСЛОВЫЕ события (верно/мимо/веха/празднование), не навигация —
 * иначе вибрация обесценивается (ux-правило «не злоупотреблять»).
 */

export const HAPTIC = {
  correct: 10,
  wrong: [8, 30, 8],
  combo: [15, 40, 15],
  celebrate: [20, 50, 20, 50, 40],
} as const;

export function buzz(pattern: number | readonly number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern as number | number[]);
    }
  } catch {
    /* нет поддержки — молча */
  }
}
