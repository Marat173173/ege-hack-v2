import type { FloorGeom, Floor, Subject, SubjectDef, TopicDef } from "./types";

/** Ротация геометрий по индексу — чтобы соседние этажи визуально различались. */
const GEOM_ROTATION: FloorGeom[] = ["disc", "hex", "slab", "torus", "facet", "studded"];

/** HSL → HEX. */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Оттенок этажа: явный hue → иначе из палитры предмета + сдвиг. */
function resolveHue(def: SubjectDef, t: TopicDef): string {
  if (t.hue) return t.hue;
  const h = (def.theme.baseHue + (t.hueShift ?? 0) + 360) % 360;
  // боссы чуть светлее и насыщеннее — «корона» выделяется
  const sat = t.boss ? Math.min(100, def.theme.sat + 8) : def.theme.sat;
  const light = t.boss ? Math.min(85, def.theme.light + 12) : def.theme.light;
  return hslToHex(h, sat, light);
}

/** RGB-строка для CSS-переменной акцента ("r g b"). */
export function accentVars(def: SubjectDef): { accent: string; accent2: string } {
  const accent =
    def.theme.accentRgb ?? hexToRgbTriplet(hslToHex(def.theme.baseHue, def.theme.sat, 62));
  const accent2 =
    def.theme.accent2Rgb ?? hexToRgbTriplet(hslToHex((def.theme.baseHue + 18) % 360, def.theme.sat, 55));
  return { accent, accent2 };
}

function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/**
 * Билдер: SubjectDef (декларация) → Subject (готов к рендеру).
 * Здесь же — единственное место, где «недозаполненные» этажи дополняются
 * визуалом. Добавить предмет = добавить SubjectDef, ничего больше.
 */
export function buildSubject(
  def: SubjectDef,
  ctx: { days: number; streak: number }
): Subject {
  const floors: Floor[] = def.topics.map((t, idx) => ({
    id: t.id,
    name: t.name,
    tag: t.tag,
    geom: t.geom ?? (t.boss ? "core" : GEOM_ROTATION[idx % GEOM_ROTATION.length]),
    pat: t.pattern ?? def.defaultPattern,
    hue: resolveHue(def, t),
    prog: t.prog,
    stab: t.stab,
    boss: t.boss,
    task: t.task,
    answer: t.answer,
    crit: t.crit,
    sum: t.sum,
    lessons: t.lessons,
    requires: t.requires,
  }));

  return {
    key: def.key,
    name: def.name,
    short: def.short,
    exam: def.exam,
    goal: def.goal,
    max: def.maxScore,
    icon: def.icon,
    status: def.status,
    days: ctx.days,
    streak: ctx.streak,
    floors,
  };
}

/** Dev-валидация декларации — ловит опечатки до рендера. */
export function validateSubjectDef(def: SubjectDef): string[] {
  const errs: string[] = [];
  if (!def.topics.length) errs.push(`${def.key}: нет тем`);
  if (def.topics.filter((t) => t.boss).length > 1)
    errs.push(`${def.key}: больше одного босса`);
  const ids = new Set<string>();
  def.topics.forEach((t) => {
    if (ids.has(t.id)) errs.push(`${def.key}: дубль id "${t.id}"`);
    ids.add(t.id);
    if (t.prog < 0 || t.prog > 100) errs.push(`${def.key}/${t.id}: prog вне 0..100`);
    if (t.stab < 0 || t.stab > 100) errs.push(`${def.key}/${t.id}: stab вне 0..100`);
  });
  return errs;
}
