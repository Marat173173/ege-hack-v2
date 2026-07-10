"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";

/**
 * Кнопка ИИ-репетитора — контекстная.
 *
 * По фидбеку: показывается ТОЛЬКО в игровом окне (Шпиль/Тропа) и ТОЛЬКО при
 * открытой теме — Инспектор рендерит её над своим bottom-sheet'ом (absolute
 * к шиту, «поднимается наверх над окошком модуля»). Ссылка несёт фильтр
 * открытой темы: /tutor?topic=<код>&subject=<предмет>.
 *
 * variant:
 *  - "sheet" (default) — над мобильным bottom-sheet'ом (absolute -top right);
 *  - "rail" — «выглядывает» слева от десктопного рейла Инспектора
 *    (absolute -left, позиционируется от fixed-контейнера рейла).
 */
export function TutorFAB({
  topic,
  variant = "sheet",
}: {
  topic: string;
  variant?: "sheet" | "rail";
}) {
  const subjectKey = useApp((s) => s.subjectKey);
  // паттерн проекта: rus → "russian" (см. FipiSubtopics/PathScreen)
  const subject = subjectKey === "rus" ? "russian" : subjectKey;

  return (
    <motion.a
      data-tour="tutor-fab"
      href={`/tutor?topic=${encodeURIComponent(topic)}&subject=${encodeURIComponent(subject)}`}
      initial={{ opacity: 0, scale: 0.7, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 280, damping: 22 }}
      whileTap={{ scale: 0.92 }}
      aria-label={`Спросить ИИ-репетитора по теме ${topic}`}
      className={`focus-ring absolute z-[2] grid h-11 w-11 place-items-center rounded-full border ${
        variant === "rail" ? "-left-[56px] top-3" : "-top-[54px] right-3"
      }`}
      style={{
        background: "rgb(var(--accent) / 0.18)",
        borderColor: "rgb(var(--accent) / 0.4)",
        color: "rgb(var(--accent))",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        boxShadow: "0 8px 20px -10px rgba(0,0,0,0.55)",
      }}
    >
      <Sparkles className="h-5 w-5" />
      <span className="sr-only">Открыть ИИ-репетитора по теме</span>
    </motion.a>
  );
}
