"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Award, TrendingUp, ArrowRight, ChevronRight } from "lucide-react";

/**
 * Компактный виджет истории попыток симулятора ЕГЭ.
 * Встраивается в экран профиля или на главную.
 *
 * Показывает:
 *   - последние 3 попытки с баллами и прогнозом
 *   - тренд (растёт ли балл при повторных попытках по тому же предмету)
 *   - ссылку «Все пробники» → /exam
 *
 * Если попыток нет — CTA-баннер «Пройди свой первый пробник».
 * Если пользователь не залогинен — не показывается.
 */

type Attempt = {
  id: string;
  subjectKey: string;
  finalizedAt: string;
  primaryScore: number;
  maxPrimaryScore: number;
  forecastExpected: number;
};

const SUBJECT_NAMES: Record<string, string> = {
  russian: "Русский",
  "social-multi": "Общество",
  "math-multi": "Математика",
};

const SUBJECT_COLORS: Record<string, string> = {
  russian: "#F2B344",
  "social-multi": "#5E92D6",
  "math-multi": "#50B280",
};

export function ExamHistoryStrip() {
  const { status } = useSession();
  const [attempts, setAttempts] = React.useState<Attempt[] | null>(null);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/exam/attempts", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAttempts(data?.attempts ?? []))
      .catch(() => setAttempts([]));
  }, [status]);

  if (status !== "authenticated") return null;
  if (attempts === null) {
    return <div className="h-32 rounded-2xl bg-white/[0.02]" />;
  }

  // Пусто → CTA-баннер
  if (attempts.length === 0) {
    return (
      <Link
        href="/exam"
        className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[rgb(var(--accent))]/10 to-white/[0.03] p-4 transition hover:border-[rgb(var(--accent))]/40"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent))]/20">
          <Award size={18} className="text-[rgb(var(--accent))]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-[rgb(var(--hi))]">
            Пройди первый пробник ЕГЭ
          </div>
          <div className="text-[11.5px] text-[rgb(var(--mid))]">
            Балл первой части + прогноз итогового по таблицам ФИПИ
          </div>
        </div>
        <ArrowRight size={16} className="shrink-0 text-[rgb(var(--mid))] transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--accent))]" />
      </Link>
    );
  }

  // Подсчёт тренда по предметам (сравниваем последние 2 попытки на предмет)
  const bySubject = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (!bySubject.has(a.subjectKey)) bySubject.set(a.subjectKey, []);
    bySubject.get(a.subjectKey)!.push(a);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
          <Award size={11} /> Пробники ЕГЭ · {attempts.length}
        </h3>
        <Link
          href="/exam"
          className="flex items-center gap-1 text-[11px] text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))]"
        >
          Все <ChevronRight size={11} />
        </Link>
      </div>

      <div className="space-y-1.5">
        {attempts.slice(0, 3).map((a) => {
          const subjectAttempts = bySubject.get(a.subjectKey) ?? [];
          const previousOnSubject = subjectAttempts.find(
            (x) => x.id !== a.id && new Date(x.finalizedAt) < new Date(a.finalizedAt)
          );
          const trend = previousOnSubject
            ? a.primaryScore - previousOnSubject.primaryScore
            : null;
          const color = SUBJECT_COLORS[a.subjectKey] ?? "#888";

          return (
            <Link
              key={a.id}
              href={`/exam/${a.id}/result`}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-[rgb(var(--accent))]/30 hover:bg-white/[0.04]"
            >
              <div
                className="h-9 w-1 shrink-0 rounded-full"
                style={{ background: color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-[rgb(var(--hi))]">
                    {SUBJECT_NAMES[a.subjectKey] ?? a.subjectKey}
                  </span>
                  <span className="font-mono text-[11px] text-[rgb(var(--lo))]">
                    {new Date(a.finalizedAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-[rgb(var(--mid))]">
                  <span className="font-mono">
                    {a.primaryScore}/{a.maxPrimaryScore} первичных
                  </span>
                  <span>·</span>
                  <span>прогноз ЕГЭ ~{a.forecastExpected}</span>
                </div>
              </div>
              {trend !== null && trend !== 0 && (
                <div
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    color: trend > 0 ? "#5FCF80" : "#F27B7B",
                    background: trend > 0 ? "rgba(95,207,128,0.1)" : "rgba(242,123,123,0.1)",
                  }}
                >
                  {trend > 0 && <TrendingUp size={11} />}
                  {trend > 0 ? "+" : ""}
                  {trend}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
