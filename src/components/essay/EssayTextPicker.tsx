"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowRight, X, PenLine, History, Loader2, FileText } from "lucide-react";

/**
 * Экран /essay — выбор одного из 12 исходных текстов + история попыток.
 *
 * Каждая карточка текста:
 *   - Название («Память о войне», «Книга как спасение» и т.д.)
 *   - Подсказка автора («Стилистика напоминает Астафьева»)
 *   - Первые 3 проблемы (уменьшенным шрифтом — для калибровки)
 *   - Кнопка «Написать сочинение»
 */

type EssayTextMeta = {
  id: string;
  title: string;
  authorHint: string | null;
  difficulty: number;
  problems: string[];
  createdAt: string;
};

type PastAttempt = {
  id: string;
  textId: string;
  wordCount: number;
  totalScore: number | null;
  maxScore: number;
  reviewedAt: string | null;
  text: { title: string };
};

export function EssayTextPicker() {
  const { status } = useSession();
  const [texts, setTexts] = React.useState<EssayTextMeta[] | null>(null);
  const [attempts, setAttempts] = React.useState<PastAttempt[] | null>(null);

  React.useEffect(() => {
    fetch("/api/essay/texts")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setTexts(data?.texts ?? []))
      .catch(() => setTexts([]));
  }, []);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/essay/attempts", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAttempts(data?.attempts ?? []))
      .catch(() => setAttempts([]));
  }, [status]);

  return (
    <div className="min-h-[100dvh] bg-[rgb(var(--bg-0))] pb-16">
      {/* Шапка */}
      <header className="flex items-center justify-between border-b border-white/5 px-3 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))]"
        >
          <X className="h-4 w-4" /> На главную
        </Link>
        <div className="flex items-center gap-2 text-[rgb(var(--hi))]">
          <PenLine className="h-4 w-4 text-[rgb(var(--accent))]" />
          <span className="font-medium">Сочинение ЕГЭ</span>
        </div>
        <div className="w-16" />
      </header>

      <div className="mx-auto max-w-3xl px-3 pt-8 sm:px-6 sm:pt-10">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 font-serif text-2xl text-[rgb(var(--hi))] sm:text-3xl">
            Тренажёр сочинения
          </h1>
          <p className="mb-6 text-[14px] leading-relaxed text-[rgb(var(--mid))] sm:text-[15px]">
            Выбери исходный текст, напиши сочинение на 150-350 слов, отправь на проверку.
            ИИ разберёт по 12 критериям ФИПИ и покажет, где потерял баллы и что докрутить.
          </p>
        </motion.div>

        {/* Список текстов */}
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
            <FileText size={12} /> Исходные тексты · {texts?.length ?? "…"}
          </h2>

          {texts === null && (
            <div className="grid gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.03]" />
              ))}
            </div>
          )}

          {texts && texts.length === 0 && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-[13px] text-yellow-300">
              Пока нет исходных текстов. Дай знать администратору.
            </div>
          )}

          {texts && texts.length > 0 && (
            <div className="grid gap-2.5">
              {texts.map((t, idx) => (
                <TextCard key={t.id} text={t} index={idx} />
              ))}
            </div>
          )}
        </section>

        {/* История попыток */}
        {status === "authenticated" && attempts && attempts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
              <History size={12} /> Мои сочинения · {attempts.length}
            </h2>
            <div className="space-y-1.5">
              {attempts.slice(0, 8).map((a) => (
                <Link
                  key={a.id}
                  href={`/essay/attempt/${a.id}`}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-[rgb(var(--accent))]/30 hover:bg-white/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-[rgb(var(--hi))]">
                      {a.text.title}
                    </div>
                    <div className="text-[11px] text-[rgb(var(--lo))]">
                      {a.wordCount} слов ·{" "}
                      {a.reviewedAt
                        ? new Date(a.reviewedAt).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "черновик"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-[rgb(var(--hi))]">
                      {a.totalScore ?? "?"}
                      <span className="text-[rgb(var(--lo))]">/{a.maxScore}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}

function TextCard({ text, index }: { text: EssayTextMeta; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 * index }}
    >
      <Link
        href={`/essay/${text.id}`}
        className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-[rgb(var(--bg-1))] p-4 transition hover:border-[rgb(var(--accent))]/40 hover:bg-white/[0.04] sm:p-5"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[rgb(var(--accent))]/15 text-[rgb(var(--accent))]">
          <FileText size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-[14.5px] font-semibold text-[rgb(var(--hi))]">
              {text.title}
            </span>
            {text.authorHint && (
              <span className="text-[10.5px] italic text-[rgb(var(--lo))]">
                · {text.authorHint}
              </span>
            )}
          </div>
          {text.problems.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {text.problems.slice(0, 2).map((p, i) => (
                <div key={i} className="line-clamp-1 text-[11.5px] text-[rgb(var(--mid))]">
                  · {p}
                </div>
              ))}
              {text.problems.length > 2 && (
                <div className="text-[11px] text-[rgb(var(--lo))]">
                  … и ещё {text.problems.length - 2}
                </div>
              )}
            </div>
          )}
        </div>
        <ArrowRight
          size={16}
          className="mt-1 shrink-0 text-[rgb(var(--mid))] transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--accent))]"
        />
      </Link>
    </motion.div>
  );
}
