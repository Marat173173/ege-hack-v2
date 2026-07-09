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

/** Невыполненный пререквизит: какая тема и какие пороги ей ещё нужны. */
export interface RequireGap {
  floor: Floor;
  /** Требуемое освоение (minProg из requires; 0 — порога нет). */
  needProg: number;
  /** Требуемая стабильность (minStab из requires; 0 — порога нет). */
  needStab: number;
}

/**
 * Невыполненные пререквизиты этажа index (requires поверх префикс-окна).
 * Требуемая тема ищется по id во ВСЁМ массиве; отсутствующий id считается
 * выполненным (в dev — предупреждение об опечатке в данных).
 */
export function requiresUnmet(floors: Floor[], index: number): RequireGap[] {
  const reqs = floors[index]?.requires;
  if (!reqs?.length) return [];
  const unmet: RequireGap[] = [];
  for (const r of reqs) {
    const dep = floors.find((f) => f.id === r.id);
    if (!dep) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `requires: тема "${r.id}" (пререквизит "${floors[index]?.id}") не найдена — пункт считается выполненным`
        );
      }
      continue;
    }
    const needProg = r.minProg ?? 0;
    const needStab = r.minStab ?? 0;
    if (dep.prog < needProg || dep.stab < needStab) {
      unmet.push({ floor: dep, needProg, needStab });
    }
  }
  return unmet;
}

/**
 * Заблокирован ли этаж index. Первый этаж открыт (если нет своих requires).
 * Каждый следующий открывается, когда средняя готовность всех предыдущих
 * ≥ UNLOCK_THRESHOLD И выполнены все его requires (AND поверх окна).
 */
export function isLocked(floors: Floor[], index: number): boolean {
  if (requiresUnmet(floors, index).length > 0) return true;
  if (index <= 0) return false;
  const prev = floors.slice(0, index);
  const avg = prev.reduce((s, f) => s + floorReadiness(f), 0) / prev.length;
  return avg < UNLOCK_THRESHOLD;
}

/**
 * Человекочитаемая причина блокировки этажа index — единый текст для тостов
 * и плашек. Сначала requires (конкретная тема-пререквизит), потом окно.
 */
export function lockReason(floors: Floor[], index: number): string {
  const unmet = requiresUnmet(floors, index);
  if (unmet.length > 0) {
    const first = unmet[0];
    const threshold =
      first.needProg > 0
        ? `на ≥${first.needProg}%`
        : `на ≥${first.needStab}% стабильности`;
    const rest = unmet.length > 1 ? ` … и ещё ${unmet.length - 1} тем` : "";
    return `Сначала открой „${first.floor.name}“ ${threshold}${rest}`;
  }
  return `Пока закрыт. Укрепи нижние темы ещё на ~${unlockGap(floors, index)}% готовности`;
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
 * Сколько закрытых этажей показываем «вперёд» сверх всех открытых.
 * Остальные скрыты и проявляются по мере готовности нижних — башня не
 * превращается в бесконечный небоскрёб из 63 этажей.
 */
export const REVEAL_LOOKAHEAD = 3;

/** Индекс первого закрытого этажа (или floors.length, если открыты все). */
export function firstLockedIndex(floors: Floor[]): number {
  const i = lockMap(floors).findIndex(Boolean);
  return i === -1 ? floors.length : i;
}

/** Индекс самого верхнего ОТКРЫТОГО этажа (текущий «фронтир» прогресса). */
export function highestOpenIndex(floors: Floor[]): number {
  const locks = lockMap(floors);
  let idx = 0;
  for (let i = 0; i < floors.length; i++) if (!locks[i]) idx = i;
  return idx;
}

/**
 * Сколько этажей показывать: все открытые + REVEAL_LOOKAHEAD закрытых «превью».
 * Всегда ≥ 1. Открытые этажи — это непрерывный префикс снизу (гейт по средней
 * готовности), поэтому видимый набор — это тоже префикс floors[0..revealCount).
 */
export function revealCount(floors: Floor[], lookahead = REVEAL_LOOKAHEAD): number {
  if (floors.length === 0) return 0;
  // отсчёт от САМОГО ВЕРХНЕГО открытого этажа + запас: так в видимый набор
  // гарантированно попадают ВСЕ открытые этажи, даже если гейт по средней
  // готовности когда-нибудь перестанет быть строго префиксным (устойчивость к
  // неоднородному/деградирующему прогрессу). Для текущих данных (открытые —
  // непрерывный префикс) это эквивалентно firstLockedIndex + lookahead.
  return Math.min(floors.length, highestOpenIndex(floors) + 1 + lookahead);
}

/**
 * Видимый префикс этажей (открытые + closed-preview). Так как это slice от 0,
 * индекс элемента здесь совпадает с индексом в полном floors — поэтому
 * lockMap(full)[i] применим напрямую.
 */
export function visibleFloors(floors: Floor[], lookahead = REVEAL_LOOKAHEAD): Floor[] {
  return floors.slice(0, revealCount(floors, lookahead));
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
