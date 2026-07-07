import type { Floor, FloorState } from "@/data/types";

/**
 * Состояние этажа выводится из (progress, stability).
 *  ghost    — призрак, прог < 8
 *  forming  — формируется, прог < 55 (сильная дрожь)
 *  unstable — монолит по высоте, но стабильность < 65 (красное кольцо, дрожит)
 *  solid    — стабильность ≥ 65 (ровное свечение, мятное кольцо)
 */
export function floorState(f: Pick<Floor, "prog" | "stab">): FloorState {
  if (f.prog < 8) return "ghost";
  if (f.prog < 55) return "forming";
  if (f.stab < 65) return "unstable";
  return "solid";
}

/** Цвета колец состояния. */
export const RING_COLOR: Record<FloorState, number> = {
  ghost: 0x647597,
  forming: 0xffc65b,
  unstable: 0xff5c6e,
  solid: 0x5be3b0,
};

/** Кольца для светлой темы: те же смыслы, но темнее — на сине-стальном
    фоне неоновые цвета тёмной темы выцветают ниже читаемого контраста. */
export const RING_COLOR_LIGHT: Record<FloorState, number> = {
  ghost: 0x46587e,
  forming: 0xc07c14,
  unstable: 0xd82e46,
  solid: 0x148f66,
};

/** Цвет кольца состояния с учётом темы сцены. */
export function ringColor(st: FloorState, isLight: boolean): number {
  return (isLight ? RING_COLOR_LIGHT : RING_COLOR)[st];
}

export const STATE_META: Record<
  FloorState,
  { label: string; color: string; cls: string }
> = {
  ghost: { label: "Призрак — не начато", color: "#647597", cls: "ghost" },
  forming: { label: "Формируется", color: "#FFC65B", cls: "forming" },
  unstable: { label: "Нестабильно", color: "#FF5C6E", cls: "unstable" },
  solid: { label: "Монолит", color: "#5BE3B0", cls: "solid" },
};
