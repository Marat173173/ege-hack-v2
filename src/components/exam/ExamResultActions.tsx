"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RotateCcw, Shuffle, Loader2 } from "lucide-react";

/**
 * Блок кнопок в конце экрана результата.
 *
 * Два действия:
 *   1. «Тот же вариант» — /api/exam/retry — новая попытка с теми же заданиями
 *      (проверить, реально ли выучил, или запомнил ответы)
 *   2. «Случайный вариант» — /api/exam/start — новая попытка с нуля
 *
 * Оба ведут на /exam/<newId>.
 */

interface Props {
  attemptId: string;
  subjectKey: string;
}

export function ExamResultActions({ attemptId, subjectKey }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<"retry" | "random" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function retryWithSameVariant() {
    setLoading("retry");
    setError(null);
    try {
      const res = await fetch("/api/exam/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось создать попытку");
        setLoading(null);
        return;
      }
      router.push(data.redirectTo);
    } catch {
      setError("Ошибка соединения");
      setLoading(null);
    }
  }

  async function startRandom() {
    setLoading("random");
    setError(null);
    try {
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ subjectKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось создать попытку");
        setLoading(null);
        return;
      }
      router.push(`/exam/${data.attemptId}`);
    } catch {
      setError("Ошибка соединения");
      setLoading(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-2xl border border-white/10 bg-[rgb(var(--bg-1))] p-5"
    >
      <h3 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
        Что дальше
      </h3>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <button
          onClick={retryWithSameVariant}
          disabled={loading !== null}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 text-left transition hover:border-[rgb(var(--accent))]/40 hover:bg-white/[0.06] disabled:opacity-50"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5">
            {loading === "retry" ? (
              <Loader2 size={16} className="animate-spin text-[rgb(var(--accent))]" />
            ) : (
              <RotateCcw size={16} className="text-[rgb(var(--accent))]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[rgb(var(--hi))]">
              Тот же вариант
            </div>
            <div className="text-[11.5px] text-[rgb(var(--mid))]">
              Проверить, реально ли выучил
            </div>
          </div>
        </button>

        <button
          onClick={startRandom}
          disabled={loading !== null}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 text-left transition hover:border-[rgb(var(--accent))]/40 hover:bg-white/[0.06] disabled:opacity-50"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5">
            {loading === "random" ? (
              <Loader2 size={16} className="animate-spin text-[rgb(var(--accent))]" />
            ) : (
              <Shuffle size={16} className="text-[rgb(var(--accent))]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[rgb(var(--hi))]">
              Новый вариант
            </div>
            <div className="text-[11.5px] text-[rgb(var(--mid))]">
              Свежий пробник с другими заданиями
            </div>
          </div>
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          {error}
        </div>
      )}
    </motion.div>
  );
}
