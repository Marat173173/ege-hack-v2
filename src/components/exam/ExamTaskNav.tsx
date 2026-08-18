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
    <div className="flex gap-1.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-10 sm:overflow-visible sm:pb-0 md:grid-cols-13 lg:grid-cols-16">
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
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] font-semibold transition-colors",
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
