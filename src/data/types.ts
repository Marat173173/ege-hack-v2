/**
 * Доменные типы платформы. Намеренно отделены от данных, чтобы добавление
 * предмета было операцией над ДАННЫМИ (один объект в реестре), а не над кодом.
 */

/** Геометрия тела этажа. Расширяется добавлением ключа в bodyGeometry(). */
export type FloorGeom =
  | "disc"
  | "hex"
  | "slab"
  | "torus"
  | "facet"
  | "studded"
  | "core";

/** Процедурная фактура. Расширяется добавлением ключа в makeTexture(). */
export type Pattern =
  | "letters" | "dots" | "grid" | "wave" | "lines" | "quill"
  | "digits" | "xsq" | "graph" | "facets" | "dice" | "sigma"
  | "atoms" | "cells" | "timeline" | "scales" | "binary" | "globe";

export type FloorState = "ghost" | "forming" | "unstable" | "solid";

/** Экзамен. Один предмет может иметь варианты ОГЭ/ЕГЭ (база/профиль). */
export type Exam = "ege" | "oge";

export interface Criterion {
  code: string; // 'К1', 'К2', ...
  name: string;
  have: number;
  max: number;
  tip: string;
  gain?: string;
}

/** Карточка детального урока (для модалки-карусели). */
export interface LessonCard {
  badge: string; // 'Теория' | 'Пример' | 'Лайфхак' | ...
  title: string;
  body: string;
  meta?: string;
}

/**
 * Тип задания внутри предмета = «этаж».
 * Визуал (geom/pattern/оттенок) задаётся декларативно, но НЕ обязателен:
 * если не указан, он выводится из палитры предмета и индекса этажа.
 */
export interface TopicDef {
  id: string;
  name: string;
  tag: string;
  /** Освоение 0..100 (высота этажа). */
  prog: number;
  /** Надёжность 0..100 (анти-дрожь). */
  stab: number;
  /** Геометрия. Если не задана — берётся из ротации по индексу. */
  geom?: FloorGeom;
  /** Фактура. Если не задана — берётся дефолт предмета. */
  pattern?: Pattern;
  /** Сдвиг оттенка относительно базового цвета предмета, в градусах (−40..40). */
  hueShift?: number;
  /** Явный оттенок (перебивает палитру). */
  hue?: string;
  /** Босс = вторая часть (корона). Максимальный запас баллов. */
  boss?: boolean;
  task?: string;
  answer?: string;
  crit?: Criterion[];
  sum?: string;
  /** Карточки детального урока (показываются в модалке-карусели). */
  lessons?: LessonCard[];
}

/**
 * Палитра предмета. Тёплая/холодная — кодирует смысл (как в дизайн-системе).
 * Оттенки этажей генерируются из baseHue + hueShift.
 */
export interface SubjectTheme {
  /** Базовый цвет-акцент (HSL hue, 0..360). */
  baseHue: number;
  /** Насыщенность/светлота для тел этажей. */
  sat: number;
  light: number;
  /** CSS-акцент (rgb-строка "r g b") для HUD. Выводится из baseHue, можно перекрыть. */
  accentRgb?: string;
  accent2Rgb?: string;
}

export interface SubjectDef {
  key: string; // 'rus', 'math', 'phys', ...
  name: string;
  short: string; // короткое имя для таба
  exam: Exam;
  goal: number;
  maxScore: number; // 100 для ЕГЭ
  /** Иконка (имя из lucide-react) — резолвится в UI. */
  icon: string;
  theme: SubjectTheme;
  /** Дефолтная фактура, если у этажа не задана своя. */
  defaultPattern: Pattern;
  topics: TopicDef[];
  /** Статус контента: live (готов) / soon (карточка-«скоро»). */
  status: "live" | "soon";
}

/** Резолвленный этаж (готов к рендеру) — выход билдера. */
export interface Floor {
  id: string;
  name: string;
  tag: string;
  geom: FloorGeom;
  pat: Pattern;
  hue: string; // итоговый HEX
  prog: number;
  stab: number;
  boss?: boolean;
  task?: string;
  answer?: string;
  crit?: Criterion[];
  sum?: string;
  lessons?: LessonCard[];
}

export interface Subject {
  key: string;
  name: string;
  short: string;
  exam: Exam;
  goal: number;
  max: number;
  icon: string;
  status: "live" | "soon";
  days: number;
  streak: number;
  floors: Floor[];
}
