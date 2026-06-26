/**
 * Геймификация — чистая логика (тестируема, без сайд-эффектов).
 * По канонам Duolingo / Apple Fitness:
 *   - XP за действия, уровни с растущим порогом,
 *   - дневная цель + дневной прогресс (кольцо),
 *   - комбо (множитель за серию верных ответов),
 *   - streak (серия дней).
 */

export interface GameState {
  xp: number; // суммарный опыт
  dailyXp: number; // опыт за сегодня
  dailyGoal: number; // цель на день
  streak: number; // серия дней
  lastActiveDay: string | null; // YYYY-MM-DD последнего захода
  combo: number; // текущая серия верных ответов подряд
  bestCombo: number;
}

export const DEFAULT_GAME: GameState = {
  xp: 0,
  dailyXp: 0,
  dailyGoal: 50,
  streak: 7,
  lastActiveDay: null,
  combo: 0,
  bestCombo: 0,
};

/** Базовая награда за событие. */
export const XP = {
  correct: 10, // верный ответ
  wrong: 2, // попытка (не наказываем — тоже немного XP, как в Duolingo)
  lessonCard: 4, // пролистал карточку урока
  trainComplete: 14, // завершил тренировку
  critiqueApply: 20, // учёл разбор второй части
  floorSolid: 40, // этаж стал монолитом (веха)
} as const;

/** Множитель комбо: каждые 3 верных подряд +0.5×, максимум 3×. */
export function comboMultiplier(combo: number): number {
  return Math.min(3, 1 + Math.floor(combo / 3) * 0.5);
}

/** Порог XP для достижения уровня L (1-индекс). Растёт квадратично-линейно. */
export function levelThreshold(level: number): number {
  // ур.1 = 0, ур.2 = 60, ур.3 = 140, ур.4 = 240, … (60·(L-1) + 20·(L-1)(L-2))
  const n = level - 1;
  return 60 * n + 20 * n * (n - 1);
}

/** Текущий уровень по суммарному XP. */
export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= levelThreshold(level + 1)) level++;
  return level;
}

/** Прогресс внутри текущего уровня: { level, into, span, ratio }. */
export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const base = levelThreshold(level);
  const next = levelThreshold(level + 1);
  const span = next - base;
  const into = xp - base;
  return { level, into, span, ratio: span > 0 ? into / span : 1, next };
}

/** Локальная дата YYYY-MM-DD. */
export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Разница в днях между двумя YYYY-MM-DD (b - a). */
export function dayDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/**
 * Применить заход в день: обновляет streak и сбрасывает дневной прогресс,
 * если наступил новый день. Возвращает новый state (+ флаг nextStreak — серия выросла).
 */
export function rolloverDay(
  g: GameState,
  now = today()
): { state: GameState; newDay: boolean } {
  if (g.lastActiveDay === now) return { state: g, newDay: false };
  let streak = g.streak;
  if (g.lastActiveDay) {
    const diff = dayDiff(g.lastActiveDay, now);
    if (diff === 1) streak = g.streak + 1; // подряд
    else if (diff > 1) streak = 1; // пропуск — серия сброшена
  }
  return {
    state: { ...g, lastActiveDay: now, dailyXp: 0, streak },
    newDay: true,
  };
}

export interface AnswerResult {
  state: GameState;
  gained: number; // сколько XP начислено
  leveledUp: boolean;
  newLevel: number;
  goalReached: boolean; // дневная цель закрыта именно этим действием
}

/** Начислить XP за событие (с учётом комбо для верных ответов). */
export function award(
  g: GameState,
  amount: number,
  opts: { correct?: boolean; resetCombo?: boolean } = {}
): AnswerResult {
  const prevLevel = levelFromXp(g.xp);
  const prevGoalMet = g.dailyXp >= g.dailyGoal;

  let combo = g.combo;
  let bestCombo = g.bestCombo;
  let gained = amount;

  if (opts.correct) {
    combo = g.combo + 1;
    bestCombo = Math.max(g.bestCombo, combo);
    gained = Math.round(amount * comboMultiplier(combo));
  } else if (opts.resetCombo) {
    combo = 0;
  }

  const xp = g.xp + gained;
  const dailyXp = g.dailyXp + gained;
  const newLevel = levelFromXp(xp);

  return {
    state: { ...g, xp, dailyXp, combo, bestCombo },
    gained,
    leveledUp: newLevel > prevLevel,
    newLevel,
    goalReached: !prevGoalMet && dailyXp >= g.dailyGoal,
  };
}
