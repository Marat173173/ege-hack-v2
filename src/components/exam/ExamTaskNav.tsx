"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Сетка навигации по заданиям пробника.
 * Мобилка — горизонтальная прокручиваемая лента, десктоп — grid.
 */
export function ExamTaskNav({
  taskCount,
  currentTask,
  answeredNumbers,
  onSelect,
}: {
  taskCount: number;
  currentTask: number;
  answeredNumbers: Set<number>;
  onSelect: (taskNumber: number) => void;
}) {
  const numbers = React.useMemo(
    () => Array.from({ length: taskCount }, (_, i) => i + 1),
    [taskCount]
  );

  return (
    <div className="-mx-3 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-10 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-13 lg:grid-cols-16">
      {numbers.map((n) => {
        const answered = answeredNumbers.has(n);
        const active = n === currentTask;
        return (
          <button
            key={n}
            onClick={() => onSelect(n)}
            aria-label={`Задание ${n}${answered ? ", отвечено" : ""}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex h-11 w-11 shrink-0 snap-start items-center justify-center rounded-lg font-mono text-[12px] font-semibold transition-colors sm:h-9 sm:w-9",
              answered
                ? "border border-yellow-500/50 bg-yellow-500/30 text-[rgb(var(--hi))]"
                : "border border-white/10 bg-white/5 text-[rgb(var(--mid))]",
              active && "border-2 border-[rgb(var(--accent))] text-[rgb(var(--hi))]"
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
