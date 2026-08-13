/**
 * Универсальный билдер этажей Шпиля из кодификатора ФИПИ.
 *
 * Единственная функция buildFloorsFromCodifier() превращает список подтем
 * (fipi-codifier-XXX.ts) в массив TopicDef для регистра предметов.
 *
 * ID этажей: "{subjectPrefix}-{кодФИПИ}" — например, "social-1.3", "math-2.5".
 * Русский исторически без префикса ("3.7.6") — сохраняем совместимость,
 * см. src/data/rus-fipi-floors.ts.
 *
 * Раздел кодификатора определяет визуальный оттенок (hueShift) и место
 * босса (последняя подтема раздела получает корону).
 */

import type { TopicDef } from "./types";
import type { FipiTopic } from "./fipi-codifier-ru";

import { FIPI_SOCIAL } from "./fipi-codifier-social";
import { FIPI_HISTORY } from "./fipi-codifier-history";
import { FIPI_MATH } from "./fipi-codifier-math";
import { FIPI_MATH_BASE } from "./fipi-codifier-math-base";
import { FIPI_PHYSICS } from "./fipi-codifier-physics";
import { FIPI_LITERATURE } from "./fipi-codifier-literature";
import { FIPI_ENGLISH } from "./fipi-codifier-english";

interface BuilderOptions {
  /** Префикс для ID этажей: "social", "history" и т.п. */
  subjectPrefix: string;
  /** Список ID подтем-«боссов» (короны, топ раздела). */
  bosses: Set<string>;
  /** Оттенок цвета по номеру верхнего раздела ("1" → -18, "2" → -8 и т.д.). */
  groupHueByRoot: (root: string) => number;
}

const GEOMS: TopicDef["geom"][] = ["disc", "hex", "torus", "slab", "core"];
const PATTERNS = ["letters", "dots", "grid", "wave", "lines", "quill"] as const;

/**
 * Ядро билдера: подтема → TopicDef.
 * Работает единообразно для любого предмета.
 */
export function buildFloorsFromCodifier(
  topics: FipiTopic[],
  opts: BuilderOptions
): TopicDef[] {
  return topics.map((t): TopicDef => {
    const root = t.code.split(".")[0];
    const depth = t.code.split(".").length;
    const isBoss = opts.bosses.has(t.code);

    return {
      id: `${opts.subjectPrefix}-${t.code}`,
      name: t.title,
      tag: t.keywords?.[0] ?? "тема",
      prog: 0,
      stab: 0,
      geom: isBoss ? "core" : GEOMS[depth % GEOMS.length],
      pattern: PATTERNS[depth % PATTERNS.length],
      hueShift: opts.groupHueByRoot(root),
      boss: isBoss,
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// ГОТОВЫЕ БИЛДЕРЫ ДЛЯ КАЖДОГО ПРЕДМЕТА
// ═══════════════════════════════════════════════════════════════

/** Обществознание: 75 подтем, 5 разделов, боссы = концы разделов. */
export function buildSocialFloors(): TopicDef[] {
  return buildFloorsFromCodifier(FIPI_SOCIAL, {
    subjectPrefix: "social",
    bosses: new Set(["1.15", "2.18", "3.10", "4.12", "5.20"]),
    groupHueByRoot: (r) => ({ "1": -20, "2": -10, "3": 0, "4": 12, "5": 24 }[r] ?? 0),
  });
}

/** История: 78 подтем, 9 разделов, боссы = ключевые эпохи. */
export function buildHistoryFloors(): TopicDef[] {
  return buildFloorsFromCodifier(FIPI_HISTORY, {
    subjectPrefix: "history",
    bosses: new Set(["1.11", "2.6", "3.8", "4.16", "5.20", "7.9", "8.4", "9.4"]),
    groupHueByRoot: (r) => {
      const map: Record<string, number> = { "1": -25, "2": -15, "3": -5, "4": 5, "5": 15, "7": 20, "8": 25, "9": 30 };
      return map[r] ?? 0;
    },
  });
}

/** Математика профиль: 41 подтема, 7 разделов, боссы = «сочинительные» задачи. */
export function buildMathFloors(): TopicDef[] {
  return buildFloorsFromCodifier(FIPI_MATH, {
    subjectPrefix: "math",
    bosses: new Set(["2.10", "4.3", "7.5"]), // параметр, интеграл, векторы — часть 2
    groupHueByRoot: (r) => ({ "1": -20, "2": -10, "3": 0, "4": 5, "5": 10, "6": 15, "7": 25 }[r] ?? 0),
  });
}

/** Математика база: 20 подтем, тот же формат, меньше боссов (сочинительной части в базе почти нет). */
export function buildMathBaseFloors(): TopicDef[] {
  return buildFloorsFromCodifier(FIPI_MATH_BASE, {
    subjectPrefix: "math-base",
    bosses: new Set(["7.4"]), // задачи по стереометрии — самое сложное в базе
    groupHueByRoot: (r) => ({ "1": -20, "2": -10, "3": 0, "5": 10, "6": 15, "7": 25 }[r] ?? 0),
  });
}

/** Физика: 108 подтем, 4 больших раздела, боссы = разделы механики/КМ. */
export function buildPhysicsFloors(): TopicDef[] {
  return buildFloorsFromCodifier(FIPI_PHYSICS, {
    subjectPrefix: "physics",
    bosses: new Set(["1.5.5", "2.2.11", "3.6.12", "4.3.4"]),
    groupHueByRoot: (r) => ({ "1": -20, "2": -5, "3": 10, "4": 25 }[r] ?? 0),
  });
}

/** Литература: 64 темы, 2 макроблока (ОШ и XX-XXI), боссы = «Война и мир», «Мастер и Маргарита». */
export function buildLiteratureFloors(): TopicDef[] {
  return buildFloorsFromCodifier(FIPI_LITERATURE, {
    subjectPrefix: "literature",
    bosses: new Set(["12", "35", "34", "56"]), // Толстой, Булгаков, Шолохов, Зарубеж XX
    groupHueByRoot: (r) => (r.startsWith("ОШ") ? -20 : 10),
  });
}

/** Английский: 121 тема, 4 раздела (речь, язык, социокульт, компенсация). */
export function buildEnglishFloors(): TopicDef[] {
  return buildFloorsFromCodifier(FIPI_ENGLISH, {
    subjectPrefix: "english",
    bosses: new Set(["1.4.10", "2.4.41", "3.5", "4.2"]),
    groupHueByRoot: (r) => ({ "1": -15, "2": 0, "3": 15, "4": 25 }[r] ?? 0),
  });
}
