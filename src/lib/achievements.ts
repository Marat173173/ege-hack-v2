import type { GameState } from "@/lib/gamification";

/**
 * Достижения — соревновательный/коллекционный слой. Чистая логика:
 * каждое достижение вычисляет прогресс из GameState (+ доп. метрики).
 */

export interface AchievementCtx {
  game: GameState;
  solidFloors: number; // монолитов всего (по всем предметам)
  overall: number; // средняя готовность к ЕГЭ (0..100)
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string; // lucide-имя
  hue: number; // цвет плашки (HSL hue)
  /** Текущее/целевое значение. */
  value: (c: AchievementCtx) => number;
  goal: number;
  /** Несколько уровней (как у Duolingo «Уровень N»). */
  tiers?: number[];
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "streak",
    name: "Энтузиаст",
    desc: "Удержи серию дней",
    icon: "Flame",
    hue: 8,
    value: (c) => c.game.streak,
    goal: 7,
    tiers: [3, 7, 14, 30],
  },
  {
    id: "xp",
    name: "Мудрец",
    desc: "Заработай очки опыта (XP)",
    icon: "Sparkles",
    hue: 130,
    value: (c) => c.game.xp,
    goal: 500,
    tiers: [100, 500, 1500, 5000],
  },
  {
    id: "combo",
    name: "Снайпер",
    desc: "Серия верных ответов подряд",
    icon: "Zap",
    hue: 45,
    value: (c) => c.game.bestCombo,
    goal: 10,
    tiers: [5, 10, 20],
  },
  {
    id: "solid",
    name: "Архитектор",
    desc: "Сделай темы монолитом",
    icon: "Building2",
    hue: 200,
    value: (c) => c.solidFloors,
    goal: 5,
    tiers: [1, 5, 12],
  },
  {
    id: "ready",
    name: "Финалист",
    desc: "Подними готовность к ЕГЭ",
    icon: "Target",
    hue: 270,
    value: (c) => c.overall,
    goal: 80,
    tiers: [50, 70, 85],
  },
];

/** Текущий уровень достижения (сколько порогов пройдено). */
export function tierOf(a: Achievement, c: AchievementCtx): { level: number; goal: number; value: number } {
  const v = a.value(c);
  const tiers = a.tiers ?? [a.goal];
  let level = 0;
  for (const t of tiers) if (v >= t) level++;
  const goal = tiers[Math.min(level, tiers.length - 1)];
  return { level, goal, value: v };
}
