"use client";

import Link from "next/link";
import { Award } from "lucide-react";

/**
 * Плавающая точка входа в симулятор ЕГЭ — pill-кнопка в ряду действий TopBar,
 * слева от ThemeToggle. На узких экранах (<640px) текст скрыт, остаётся
 * только иконка, чтобы ряд не расползался.
 */
export function ExamButton() {
  return (
    <Link
      href="/exam"
      aria-label="Пробник ЕГЭ"
      title="Пробник ЕГЭ"
      className="flex h-11 w-11 items-center justify-center gap-1.5 rounded-full border border-line bg-panel text-mid backdrop-blur-md transition-colors hover:text-hi sm:w-auto sm:px-3.5"
    >
      <Award size={16} className="shrink-0 text-accent" />
      <span className="hidden text-[12.5px] font-semibold sm:inline">Пробник</span>
    </Link>
  );
}
