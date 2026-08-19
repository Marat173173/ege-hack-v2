"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { PenLine, TrendingUp, ArrowRight, ChevronRight } from "lucide-react";

/**
 * Компактный виджет истории сочинений — аналог ExamHistoryStrip.
 * Встраивается в ProfileScreen под симулятором ЕГЭ.
 *
 * Показывает:
 *   - Пустое → CTA-баннер «Напиши первое сочинение»
 *   - Есть попытки → последние 3 с баллом и трендом
 *
 * Тренд считается по последним 2 попыткам подряд (сравнение totalScore).
 * Не по одному и тому же тексту — иначе слишком узко (у ученика может быть
 * 5 разных текстов, а совпадений нет).
 */

type Attempt = {
  id: string;
  textId: string;
  wordCount: number;
  totalScore: number | null;
  maxScore: number;
  reviewedAt: string | null;
  text: { title: string };
};

export function EssayHistoryStrip() {
  const { status } = useSession();
  const [attempts, setAttempts] = React.useState<Attempt[] | null>(null);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/essay/attempts", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAttempts(data?.attempts ?? []))
      .catch(() => setAttempts([]));
  }, [status]);

  if (status !== "authenticated") return null;
  if (attempts === null) {
    return <div className="h-32 rounded-2xl bg-white/[0.02]" />;
  }

  // Пусто → CTA
  if (attempts.length === 0) {
    return (
      <Link
        href="/essay"
        className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[rgb(var(--accent))]/10 to-white/[0.03] p-4 transition hover:border-[rgb(var(--accent))]/40"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[rgb(var(--accent))]/20">
          <PenLine size={18} className="text-[rgb(var(--accent))]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-[rgb(var(--hi))]">
            Напиши первое сочинение
          </div>
          <div className="text-[11.5px] text-[rgb(var(--mid))]">
            Разбор по 12 критериям ФИПИ. 12 текстов в стиле реального ЕГЭ.
          </div>
        </div>
        <ArrowRight size={16} className="shrink-0 text-[rgb(var(--mid))] transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--accent))]" />
      </Link>
    );
  }

  // Тренд: сравнение с предыдущей по времени попыткой
  const attemptsWithTrend = attempts.map((a, i) => {
    const prev = attempts[i + 1]; // attempts отсортированы по createdAt DESC
    const trend = prev?.totalScore != null && a.totalScore != null
      ? a.totalScore - prev.totalScore
      : null;
    return { ...a, trend };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
          <PenLine size={11} /> Сочинения · {attempts.length}
        </h3>
        <Link
          href="/essay"
          className="flex items-center gap-1 text-[11px] text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))]"
        >
          Все <ChevronRight size={11} />
        </Link>
      </div>

      <div className="space-y-1.5">
        {attemptsWithTrend.slice(0, 3).map((a) => (
          <Link
            key={a.id}
            href={`/essay/attempt/${a.id}`}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-[rgb(var(--accent))]/30 hover:bg-white/[0.04]"
          >
            <div className="h-9 w-1 shrink-0 rounded-full bg-[rgb(var(--accent))]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-[13px] font-medium text-[rgb(var(--hi))]">
                  {a.text.title}
                </span>
                {a.reviewedAt && (
                  <span className="shrink-0 font-mono text-[11px] text-[rgb(var(--lo))]">
                    {new Date(a.reviewedAt).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11.5px] text-[rgb(var(--mid))]">
                {a.wordCount} слов
              </div>
            </div>
            {a.totalScore != null && (
              <div className="flex items-center gap-2 shrink-0">
                {a.trend !== null && a.trend !== 0 && (
                  <div
                    className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-medium"
                    style={{
                      color: a.trend > 0 ? "#5FCF80" : "#F27B7B",
                      background: a.trend > 0 ? "rgba(95,207,128,0.1)" : "rgba(242,123,123,0.1)",
                    }}
                  >
                    {a.trend > 0 && <TrendingUp size={10} />}
                    {a.trend > 0 ? "+" : ""}
                    {a.trend}
                  </div>
                )}
                <div className="font-mono text-sm text-[rgb(var(--hi))]">
                  {a.totalScore}<span className="text-[rgb(var(--lo))]">/{a.maxScore}</span>
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
