"use client";

import Link from "next/link";
import { PenLine } from "lucide-react";

/**
 * Кнопка входа в тренажёр сочинения.
 * Ставится в TopBar рядом с ExamButton — по паттерну проекта.
 *
 * На <640px — иконка + короткая подпись, чтобы отличалась от «Пробник».
 * На sm+ — иконка + текст «Сочинение».
 */
export function EssayButton() {
  return (
    <Link
      href="/essay"
      aria-label="Тренажёр сочинения"
      className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[12.5px] font-medium text-[rgb(var(--hi))] transition hover:bg-white/10 sm:px-3.5"
    >
      <PenLine size={13} className="text-[rgb(var(--accent))]" />
      <span className="hidden sm:inline">Сочинение</span>
    </Link>
  );
}
