import { REGISTRY } from "./registry";
import { buildSubject, accentVars, validateSubjectDef } from "./build-subject";
import type { Subject, SubjectDef } from "./types";

export type { Subject, Floor, FloorState, Criterion } from "./types";

const CTX = { days: 112, streak: 7 };

// dev-валидация деклараций — падает заметно при опечатке в реестре
if (process.env.NODE_ENV !== "production") {
  const errs = REGISTRY.flatMap(validateSubjectDef);
  if (errs.length) console.warn("[catalog] проблемы в реестре:\n" + errs.join("\n"));
}

/** Декларации по ключу (нужны для акцентов/иконок/статуса). */
export const DEFS: Record<string, SubjectDef> = Object.fromEntries(
  REGISTRY.map((d) => [d.key, d])
);

/** Все ключи в порядке реестра. */
export const ALL_KEYS = REGISTRY.map((d) => d.key);

/** Ключи готовых предметов. */
export const LIVE_KEYS = REGISTRY.filter((d) => d.status === "live").map((d) => d.key);

/** CSS-переменные акцента для предмета (для смены темы). */
export function accentForKey(key: string) {
  const def = DEFS[key];
  return def ? accentVars(def) : { accent: "242 179 68", accent2: "232 132 59" };
}

/** Резолвленные предметы по ключу (готовы к рендеру). */
export const SUBJECTS: Record<string, Subject> = Object.fromEntries(
  REGISTRY.map((d) => [d.key, buildSubject(d, CTX)])
);

/** Лёгкие карточки для пикера предметов (без построения этажей). */
export interface SubjectCard {
  key: string;
  name: string;
  short: string;
  icon: string;
  status: "live" | "soon";
  topics: number;
  exam: "ege" | "oge";
}
export const CARDS: SubjectCard[] = REGISTRY.map((d) => ({
  key: d.key,
  name: d.name,
  short: d.short,
  icon: d.icon,
  status: d.status,
  topics: d.topics.length,
  exam: d.exam,
}));
