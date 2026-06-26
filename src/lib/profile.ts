/**
 * Профиль пользователя — персонализация.
 * Чистые типы и хелперы (без сайд-эффектов).
 */

/** Формат визуализации прогресса. */
export type ViewMode = "spire" | "path";

export interface Profile {
  name: string;
  avatarEmoji: string; // эмодзи-аватар
  avatarHue: number; // HSL hue 0..360 — влияет на акцент/Шпиль
  targetScore: number; // целевой балл
  examDate: string | null; // YYYY-MM-DD
  /** Выбранный формат: вертикальный Шпиль или горизонтальная Тропа. */
  viewMode: ViewMode;
  /** Сделан ли выбор формата (иначе показываем экран выбора). */
  viewChosen: boolean;
  notify: {
    daily: boolean; // ежедневное напоминание заниматься
    streakRisk: boolean; // «серия под угрозой»
    weekly: boolean; // недельный отчёт
    parent: boolean; // копия родителю
  };
  sound: boolean; // звуки в приложении
}

export const AVATARS = ["🦊", "🚀", "🧠", "⚡", "🦉", "🐺", "🔥", "💎", "🎯", "🛰️", "🦅", "🌀"];

/** Оттенок аватара по индексу — единый источник правды (выбор и дефолт совпадают). */
export function avatarHueFor(index: number): number {
  // 🦊 (index 0) — янтарный, дальше равномерно по кругу
  return (38 + index * 30) % 360;
}

export const DEFAULT_PROFILE: Profile = {
  name: "Ученик",
  avatarEmoji: "🦊",
  avatarHue: avatarHueFor(0), // 38 — янтарь, совпадает с акцентом Русского
  targetScore: 80,
  examDate: null,
  viewMode: "spire",
  viewChosen: false,
  notify: { daily: true, streakRisk: true, weekly: true, parent: false },
  sound: true,
};

/** Дней до экзамена (или null, если дата не задана / прошла). */
export function daysToExam(examDate: string | null, now = new Date()): number | null {
  if (!examDate) return null;
  const target = new Date(examDate + "T00:00:00");
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((target.getTime() - t0.getTime()) / 86_400_000);
  return diff >= 0 ? diff : null;
}

/** Инициалы из имени (для аватара-фолбэка). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
