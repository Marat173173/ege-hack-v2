/**
 * 7 предметов для мультипредметности. Добавляются в REGISTRY через спред.
 *
 * ВАЖНО про ключи:
 *   Если в REGISTRY уже есть предмет с таким же key (например, "math"),
 *   старый останется первым в массиве — find(subject => subject.key === "math")
 *   вернёт исходный, а не новый. Чтобы не задевать существующие live-предметы,
 *   новые ключи имеют суффикс "-multi" (math-multi, physics-multi и т.д.).
 *   Так гарантируем изоляцию.
 *
 * Все новые предметы имеют status="soon" — на UI как «Скоро».
 * Переключай на "live" по одному, когда контент по этому предмету готов.
 *
 * Иконки — имена lucide-react (не эмодзи), чтобы совпасть с существующей системой:
 *   Scale, ScrollText, Sigma, Calculator, Atom, BookOpen, Languages
 */

import type { SubjectDef } from "./types";
import {
  buildSocialFloors,
  buildHistoryFloors,
  buildMathFloors,
  buildMathBaseFloors,
  buildPhysicsFloors,
  buildLiteratureFloors,
  buildEnglishFloors,
} from "./build-fipi-floors";

export const SUBJECTS_MULTI: SubjectDef[] = [
  {
    key: "social-multi",
    name: "Обществознание",
    short: "Общество",
    exam: "ege",
    goal: 80,
    maxScore: 100,
    icon: "Scale",
    status: "soon",
    defaultPattern: "grid",
    theme: { baseHue: 210, sat: 68, light: 58, accentRgb: "94 146 214", accent2Rgb: "72 118 188" },
    topics: buildSocialFloors(),
  },
  {
    key: "history-multi",
    name: "История",
    short: "История",
    exam: "ege",
    goal: 80,
    maxScore: 100,
    icon: "ScrollText",
    status: "soon",
    defaultPattern: "lines",
    theme: { baseHue: 26, sat: 62, light: 55, accentRgb: "192 128 82", accent2Rgb: "162 100 62" },
    topics: buildHistoryFloors(),
  },
  {
    key: "math-multi",
    name: "Математика (профиль)",
    short: "Матем-Ф",
    exam: "ege",
    goal: 80,
    maxScore: 100,
    icon: "Sigma",
    status: "soon",
    defaultPattern: "grid",
    theme: { baseHue: 148, sat: 60, light: 52, accentRgb: "80 178 128", accent2Rgb: "56 148 106" },
    topics: buildMathFloors(),
  },
  {
    key: "math-base-multi",
    name: "Математика (база)",
    short: "Матем-Б",
    exam: "ege",
    goal: 90,
    maxScore: 100,
    icon: "Calculator",
    status: "soon",
    defaultPattern: "dots",
    theme: { baseHue: 172, sat: 55, light: 55, accentRgb: "92 178 168", accent2Rgb: "68 148 138" },
    topics: buildMathBaseFloors(),
  },
  {
    key: "physics-multi",
    name: "Физика",
    short: "Физика",
    exam: "ege",
    goal: 80,
    maxScore: 100,
    icon: "Atom",
    status: "soon",
    defaultPattern: "wave",
    theme: { baseHue: 278, sat: 60, light: 60, accentRgb: "168 122 220", accent2Rgb: "140 98 192" },
    topics: buildPhysicsFloors(),
  },
  {
    key: "literature-multi",
    name: "Литература",
    short: "Литер",
    exam: "ege",
    goal: 80,
    maxScore: 100,
    icon: "BookOpen",
    status: "soon",
    defaultPattern: "quill",
    theme: { baseHue: 348, sat: 55, light: 55, accentRgb: "204 96 116", accent2Rgb: "174 74 92" },
    topics: buildLiteratureFloors(),
  },
  {
    key: "english-multi",
    name: "Английский язык",
    short: "Англ",
    exam: "ege",
    goal: 80,
    maxScore: 100,
    icon: "Languages",
    status: "soon",
    defaultPattern: "letters",
    theme: { baseHue: 48, sat: 70, light: 58, accentRgb: "222 186 88", accent2Rgb: "192 158 62" },
    topics: buildEnglishFloors(),
  },
];
