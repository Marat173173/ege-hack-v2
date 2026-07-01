import type { TopicDef } from "./types";
import { FIPI_RU } from "./fipi-codifier-ru";

/**
 * Строит массив из 63 этажей русского языка на основе кодификатора ФИПИ 2026.
 * Каждая подтема кодификатора = один этаж Шпиля.
 *
 * Группировка (для Тропы):
 *  - 1.x — Текст
 *  - 2.x — Функциональная стилистика
 *  - 3.1–3.8 — Язык (крупная секция)
 *  - 4.x — Общие сведения о языке
 *  - 5.x — Речь. Речевое общение
 *
 * «Боссы» (короны) — по одной в конце каждого крупного раздела:
 *   1.5, 2.5, 3.8.9, 4.4, 5.3
 */

const BOSSES = new Set(["1.5", "2.5", "3.8.9", "4.4", "5.3"]);

/** hueShift для раздела (визуальный «регистр цвета» на Шпиле). */
const GROUP_HUE: Record<string, number> = {
  "1": -18,
  "2": -8,
  "3": 0,
  "4": 12,
  "5": 22,
};

/** Паттерн этажа зависит от вложенности кода (визуальный ритм). */
const PATTERNS = ["letters", "dots", "grid", "wave", "lines", "quill"] as const;

const GEOMS: TopicDef["geom"][] = ["disc", "hex", "torus", "slab", "core"];

export function buildRusFloors(): TopicDef[] {
  return FIPI_RU.map((t): TopicDef => {
    const rootGroup = t.code.split(".")[0];
    const depth = t.code.split(".").length; // 1.5→2, 3.7.6→3
    const isBoss = BOSSES.has(t.code);

    return {
      id: t.code,           // используем код ФИПИ как id этажа
      name: t.title,
      tag: t.keywords?.[0] ?? "тема",
      prog: 0,
      stab: 0,
      geom: isBoss ? "core" : GEOMS[depth % GEOMS.length],
      pattern: PATTERNS[depth % PATTERNS.length],
      hueShift: GROUP_HUE[rootGroup] ?? 0,
      boss: isBoss,
    };
  });
}
