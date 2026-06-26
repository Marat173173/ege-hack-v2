import type { Subject } from "@/data/types";
import { floorState } from "./floor-state";

export interface ScoreResult {
  aP: number; // средневзвешенный прогресс
  aS: number; // средневзвешенная стабильность (округл.)
  mid: number; // центр прогноза
  half: number; // полуширина диапазона
  min: number;
  max: number;
  solid: number; // освоенных этажей
  total: number;
}

/**
 * Прогноз балла — всегда ДИАПАЗОН, а не точная цифра.
 * Это продуктовое и этическое требование, зашитое в визуал «Шпиля».
 *
 *  mid  = round(36 + 0.60 × avgProgress)
 *  half = round(3 + (100 − avgStability)/100 × 19)
 * Чем выше стабильность, тем уже диапазон (до ±3).
 * Босс (вторая часть) идёт с весом 1.7.
 */
export function computeScore(s: Subject): ScoreResult {
  let wp = 0,
    ws = 0,
    wsum = 0;
  s.floors.forEach((f) => {
    const w = f.boss ? 1.7 : 1;
    wp += f.prog * w;
    ws += f.stab * w;
    wsum += w;
  });
  const aP = wp / wsum;
  const aS = ws / wsum;
  const mid = Math.round(36 + 0.6 * aP);
  const half = Math.round(3 + ((100 - aS) / 100) * 19);
  const min = Math.max(0, mid - half);
  const max = Math.min(100, mid + half);
  const solid = s.floors.filter((f) => floorState(f) === "solid").length;
  return { aP, aS: Math.round(aS), mid, half, min, max, solid, total: s.floors.length };
}

/** Цвет диапазона: узкий = надёжно (мятный), широкий = риск (красный). */
export function bandColor(half: number): string {
  return half <= 6 ? "#5BE3B0" : half <= 12 ? "#FFC65B" : "#FF5C6E";
}
