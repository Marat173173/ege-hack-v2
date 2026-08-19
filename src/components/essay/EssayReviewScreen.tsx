"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  X, Award, TrendingUp, TrendingDown, CheckCircle2, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Sparkles, ArrowRight, PenLine, FileText,
} from "lucide-react";
import type { EssayReview, KriterionScore } from "@/lib/essay/types";
import { KRITERION_LABEL } from "@/lib/essay/types";

/**
 * Экран разбора сочинения — самое ценное для ученика.
 *
 * Показывает:
 *   - Крупный балл сверху: «17 из 25»
 *   - Прогресс-бар с цветом (красный/жёлтый/зелёный)
 *   - Общую оценку (summary из Claude)
 *   - Сильные стороны (мотивация)
 *   - 2-4 ключевых совета (quickTips)
 *   - Развёрнутый разбор по каждому К1-К12 (кликабельный аккордеон)
 *   - Свернутое сочинение ученика — можно посмотреть, что писал
 *   - Кнопки «Написать ещё раз» / «Другой текст»
 */

interface Props {
  attemptId: string;
}

type AttemptData = {
  id: string;
  text: { id: string; title: string; body: string; problems: string[] };
  content: string;
  wordCount: number;
  status: "reviewing" | "reviewed" | "failed";
  review: EssayReview | null;
  totalScore: number | null;
  maxScore: number;
  createdAt: string;
  reviewedAt: string | null;
};

export function EssayReviewScreen({ attemptId }: Props) {
  const [data, setData] = React.useState<AttemptData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`/api/essay/attempt/${attemptId}`, { credentials: "same-origin" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Не удалось загрузить разбор");
        return d;
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [attemptId]);

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-[rgb(var(--bg-0))] p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <div className="mb-4 text-[14px] text-[rgb(var(--hi))]">{error}</div>
          <Link href="/essay" className="text-[13px] text-[rgb(var(--accent))] underline">
            К списку текстов
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[rgb(var(--bg-0))]">
        <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--accent))]" />
      </div>
    );
  }

  if (data.status === "failed") {
    return (
      <div className="min-h-[100dvh] bg-[rgb(var(--bg-0))] p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <div className="mb-2 text-[15px] font-medium text-[rgb(var(--hi))]">
            Проверка не удалась
          </div>
          <div className="mb-4 text-[13px] text-[rgb(var(--mid))]">
            Модель не смогла обработать сочинение. Попробуй отправить ещё раз.
          </div>
          <Link
            href={`/essay/${data.text.id}`}
            className="inline-block text-[13px] text-[rgb(var(--accent))] underline"
          >
            Вернуться к тексту
          </Link>
        </div>
      </div>
    );
  }

  if (data.status === "reviewing" || !data.review) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[rgb(var(--bg-0))]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[rgb(var(--accent))]" />
          <div className="text-[13px] text-[rgb(var(--mid))]">Проверяем сочинение…</div>
          <div className="mt-1 text-[11px] text-[rgb(var(--lo))]">
            Обычно занимает 20-40 секунд
          </div>
        </div>
      </div>
    );
  }

  const review = data.review;

  return (
    <div className="min-h-[100dvh] bg-[rgb(var(--bg-0))] pb-16">
      {/* Шапка */}
      <header className="border-b border-white/5 px-3 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/essay"
            className="flex items-center gap-2 text-sm text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))]"
          >
            <X className="h-4 w-4" /> К текстам
          </Link>
          <div className="truncate px-2 text-[13px] font-medium text-[rgb(var(--hi))] sm:text-[14px]">
            {data.text.title}
          </div>
          <div className="w-16" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-3 pt-6 sm:px-6 sm:pt-8">
        {/* Крупный балл */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-3xl border border-white/10 bg-[rgb(var(--bg-1))] p-6 text-center sm:p-8"
        >
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
            <Award size={12} className="mr-1 inline" /> Разбор по К1–К12
          </div>
          <div className="mb-1 flex items-baseline justify-center gap-2">
            <span className="font-serif text-6xl font-bold text-[rgb(var(--accent))] sm:text-7xl">
              {review.totalScore}
            </span>
            <span className="font-serif text-2xl text-[rgb(var(--lo))]">
              / {review.maxScore}
            </span>
          </div>
          <div className="mb-4 text-[12px] text-[rgb(var(--mid))]">
            {data.wordCount} слов
          </div>

          <ScoreBar totalScore={review.totalScore} maxScore={review.maxScore} />

          <p className="mt-4 text-[13.5px] leading-relaxed text-[rgb(var(--hi))]">
            {review.summary}
          </p>
        </motion.section>

        {/* Сильные стороны + советы */}
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          {review.strongPoints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-green-500/20 bg-green-500/[0.04] p-4"
            >
              <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-green-400">
                <Sparkles size={11} /> сильные стороны
              </div>
              <ul className="space-y-1.5 text-[12.5px] leading-snug text-[rgb(var(--hi))]">
                {review.strongPoints.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-green-400" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {review.quickTips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-[rgb(var(--accent))]/20 bg-[rgb(var(--accent))]/[0.04] p-4"
            >
              <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--accent))]">
                <TrendingUp size={11} /> что докрутить
              </div>
              <ul className="space-y-1.5 text-[12.5px] leading-snug text-[rgb(var(--hi))]">
                {review.quickTips.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 text-[rgb(var(--accent))]">→</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>

        {/* Разбор по критериям */}
        <section className="mb-6">
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
            Разбор по критериям
          </h2>
          <div className="space-y-1.5">
            {review.criteria.map((c, i) => (
              <CriterionCard key={c.code} criterion={c} index={i} />
            ))}
          </div>
        </section>

        {/* Свернутое сочинение ученика */}
        <EssayContentBlock content={data.content} />

        {/* Кнопки действий */}
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          <Link
            href={`/essay/${data.text.id}`}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-[rgb(var(--bg-1))] px-4 py-3 text-[13.5px] font-semibold text-[rgb(var(--hi))] transition hover:border-[rgb(var(--accent))]/40 hover:bg-white/[0.04]"
          >
            <PenLine size={14} /> Написать ещё раз
          </Link>
          <Link
            href="/essay"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[rgb(var(--accent))] px-4 py-3 text-[13.5px] font-semibold text-[rgb(var(--bg-0))] transition-transform hover:brightness-110 active:scale-[0.99]"
          >
            Другой текст <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═══ Вспомогательные ═══════════════════════════════════════════════

function ScoreBar({ totalScore, maxScore }: { totalScore: number; maxScore: number }) {
  const pct = Math.round((totalScore / maxScore) * 100);
  const color = pct >= 70 ? "#5FCF80" : pct >= 40 ? "#F2B344" : "#F27B7B";
  return (
    <div className="mx-auto mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-white/5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

function CriterionCard({ criterion: c, index }: { criterion: KriterionScore; index: number }) {
  const [open, setOpen] = React.useState(false);
  const pct = c.score / c.max;
  const color = pct === 1 ? "#5FCF80" : pct >= 0.5 ? "#F2B344" : "#F27B7B";
  const label = KRITERION_LABEL[c.code];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.02 * index }}
      className="overflow-hidden rounded-xl border border-white/[0.08] bg-[rgb(var(--bg-1))]"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-white/[0.02] sm:px-4"
      >
        <div
          className="grid h-8 w-11 shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold text-[rgb(var(--bg-0))]"
          style={{ background: color }}
        >
          {c.score}/{c.max}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-medium text-[rgb(var(--hi))] sm:text-[13px]">
            <span className="mr-1.5 font-mono text-[11px] text-[rgb(var(--lo))]">{c.code}</span>
            {label}
          </div>
        </div>
        {open ? <ChevronUp size={14} className="text-[rgb(var(--mid))]" /> : <ChevronDown size={14} className="text-[rgb(var(--mid))]" />}
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="border-t border-white/[0.06] px-3.5 py-3 sm:px-4"
        >
          <p className="text-[12.5px] leading-relaxed text-[rgb(var(--hi))]">
            {c.comment}
          </p>
          {c.advice && (
            <div className="mt-2 flex gap-2 rounded-lg bg-[rgb(var(--accent))]/[0.08] p-2.5">
              <TrendingUp size={13} className="mt-0.5 shrink-0 text-[rgb(var(--accent))]" />
              <p className="text-[12px] leading-relaxed text-[rgb(var(--hi))]">
                <span className="font-medium text-[rgb(var(--accent))]">Совет: </span>
                {c.advice}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function EssayContentBlock({ content }: { content: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[rgb(var(--bg-1))]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-white/[0.02]"
      >
        <FileText size={13} className="text-[rgb(var(--mid))]" />
        <span className="flex-1 text-[12.5px] font-medium text-[rgb(var(--hi))]">
          Твоё сочинение
        </span>
        {open ? <ChevronUp size={14} className="text-[rgb(var(--mid))]" /> : <ChevronDown size={14} className="text-[rgb(var(--mid))]" />}
      </button>
      {open && (
        <div className="whitespace-pre-line border-t border-white/[0.06] px-4 py-4 text-[13.5px] leading-relaxed text-[rgb(var(--hi))]">
          {content}
        </div>
      )}
    </div>
  );
}
