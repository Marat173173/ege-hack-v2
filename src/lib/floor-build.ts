import type { Floor } from "@/data/types";

/**
 * «Шпиль строится по готовности».
 *
 * Высота тела этажа растёт с освоением (prog): неосвоенный — тонкий каркас у
 * основания, по мере прогресса вырастает в полный монолит.
 *
 * Гейтинг (мягкий): этаж «заблокирован», пока средняя готовность ВСЕХ
 * предыдущих этажей не достигнет порога. Заблокированный виден (каркас + замок),
 * но не открывает тренировку — сначала укрепи нижние. Босс-корона открывается
 * последней. Это и собирает башню снизу вверх, и не прячет карту экзамена.
 */

/** Доля высоты тела этажа от освоения: каркас (0.18) → полный монолит (1). */
export function buildHeightFactor(prog: number): number {
  const p = Math.max(0, Math.min(100, prog)) / 100;
  // лёгкая ease-out, чтобы рост был заметным уже на старте
  return 0.18 + 0.82 * Math.pow(p, 0.85);
}

/** Порог разблокировки следующего этажа (средняя готовность предыдущих, %). */
export const UNLOCK_THRESHOLD = 58;

/** «Готовность» одного этажа: освоение с поправкой на стабильность. */
export function floorReadiness(f: Pick<Floor, "prog" | "stab">): number {
  return f.prog * 0.7 + f.stab * 0.3;
}

/**
 * Заблокирован ли этаж index. Первый этаж всегда открыт. Каждый следующий
 * открывается, когда средняя готовность всех предыдущих ≥ UNLOCK_THRESHOLD.
 */
export function isLocked(floors: Floor[], index: number): boolean {
  if (index <= 0) return false;
  const prev = floors.slice(0, index);
  const avg = prev.reduce((s, f) => s + floorReadiness(f), 0) / prev.length;
  return avg < UNLOCK_THRESHOLD;
}

/** Сколько % средней готовности не хватает, чтобы открыть этаж index (0 если открыт). */
export function unlockGap(floors: Floor[], index: number): number {
  if (index <= 0) return 0;
  const prev = floors.slice(0, index);
  const avg = prev.reduce((s, f) => s + floorReadiness(f), 0) / prev.length;
  return Math.max(0, Math.round(UNLOCK_THRESHOLD - avg));
}

/** Карта блокировок для всех этажей (для рендера за один проход). */
export function lockMap(floors: Floor[]): boolean[] {
  return floors.map((_, i) => isLocked(floors, i));
}

/**
 * Общая готовность к ЕГЭ по предмету (0..100) — высота всего Шпиля как индикатор.
 * Босс (вторая часть) весит больше.
 */
export function overallReadiness(floors: Floor[]): number {
  let w = 0;
  let acc = 0;
  floors.forEach((f) => {
    const weight = f.boss ? 1.7 : 1;
    acc += floorReadiness(f) * weight;
    w += weight;
  });
  return w > 0 ? Math.round(acc / w) : 0;
}
