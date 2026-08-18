"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ScrollText,
  Sigma,
  BookOpenText,
  ArrowRight,
  Clock,
  Award,
  Loader2,
  X,
  History,
  type LucideIcon,
} from "lucide-react";

/**
 * Выбор предмета для симулятора + история попыток.
 *
 * Показываются только предметы с полной поддержкой симулятора
 * (спецификация в src/data/exam-specs.ts).
 */

type SubjectMeta = {
  key: string;
  displayName: string;
  short: string;
  icon: LucideIcon;
  hue: string;
  taskCount: number;
  maxScore: number;
  minutes: number;
  description: string;
};

const SUBJECTS: SubjectMeta[] = [
  {
    key: "russian",
    displayName: "Русский язык",
    short: "Русский",
    icon: BookOpenText,
    hue: "#F2B344",
    taskCount: 26,
    maxScore: 30,
    minutes: 90,
    description: "26 заданий: орфография, пунктуация, лексика, работа с текстом, средства выразительности.",
  },
  {
    key: "social-multi",
    displayName: "Обществознание",
    short: "Общество",
    icon: ScrollText,
    hue: "#5E92D6",
    taskCount: 20,
    maxScore: 28,
    minutes: 90,
    description: "20 заданий: человек и общество, экономика, соцсфера, политика, право.",
  },
  {
    key: "math-multi",
    displayName: "Математика (профиль)",
    short: "Матем-Ф",
    icon: Sigma,
    hue: "#50B280",
    taskCount: 12,
    maxScore: 12,
    minutes: 100,
    description: "12 заданий 1-й части: планиметрия, вероятность, стереометрия, функции, тригонометрия.",
  },
];

type PastAttempt = {
  id: string;
  subjectKey: string;
  finalizedAt: string;
  primaryScore: number;
  maxPrimaryScore: number;
  testScorePart1: number;
  forecastExpected: number;
};

export function ExamSubjectPicker() {
  const router = useRouter();
  const { status } = useSession();
  const [startingSubject, setStartingSubject] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<PastAttempt[] | null>(null);

  // Тянем историю
  React.useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/exam/attempts", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setHistory(data?.attempts ?? []))
      .catch(() => setHistory([]));
  }, [status]);

  async function start(key: string) {
    if (status !== "authenticated") {
      setError("Войди в аккаунт, чтобы сохранять результаты пробников.");
      return;
    }
    setStartingSubject(key);
    setError(null);
    try {
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ subjectKey: key }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось начать пробник");
        setStartingSubject(null);
        return;
      }
      router.push(`/exam/${data.attemptId}`);
    } catch {
      setError("Ошибка соединения. Попробуй ещё раз.");
      setStartingSubject(null);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[rgb(var(--bg-0))] pb-16">
      {/* Шапка */}
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-6">
        <a
          href="/"
          className="flex items-center gap-2 text-sm text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))]"
        >
          <X className="h-4 w-4" /> На главную
        </a>
        <div className="flex items-center gap-2 text-[rgb(var(--hi))]">
          <Award className="h-4 w-4 text-[rgb(var(--accent))]" />
          <span className="font-medium">Симулятор ЕГЭ</span>
        </div>
        <div className="w-16" />
      </header>

      {/* Интро */}
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:pt-10">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-2 font-serif text-2xl text-[rgb(var(--hi))] sm:text-3xl">
            Пробник ЕГЭ
          </h1>
          <p className="mb-6 text-[14px] leading-relaxed text-[rgb(var(--mid))] sm:text-[15px]">
            Первая часть по кодификатору ФИПИ 2026 — тесты с автопроверкой.
            Балл первой части считается сразу, прогноз итогового с учётом второй части — по таблицам ФИПИ.
            Есть таймер и пауза.
          </p>
        </motion.div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
            {error}
          </div>
        )}

        {/* Карточки предметов */}
        <div className="mb-10 grid gap-3 sm:grid-cols-2">
          {SUBJECTS.map((s) => (
            <SubjectCard
              key={s.key}
              subject={s}
              onStart={() => start(s.key)}
              starting={startingSubject === s.key}
              disabled={startingSubject !== null && startingSubject !== s.key}
            />
          ))}
        </div>

        {/* История */}
        {history && history.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
              <History size={12} /> Мои пробники · {history.length}
            </h2>
            <div className="space-y-2">
              {history.slice(0, 10).map((a) => {
                const subject = SUBJECTS.find((s) => s.key === a.subjectKey);
                return (
                  <a
                    key={a.id}
                    href={`/exam/${a.id}/result`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-[rgb(var(--accent))]/40 hover:bg-white/[0.04]"
                  >
                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[rgb(var(--bg-0))]"
                      style={{ background: subject?.hue ?? "#888" }}
                    >
                      {subject ? <subject.icon size={16} /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-[rgb(var(--hi))]">
                        {subject?.displayName ?? a.subjectKey}
                      </div>
                      <div className="text-[11px] text-[rgb(var(--lo))]">
                        {new Date(a.finalizedAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-[rgb(var(--hi))]">
                        {a.primaryScore}<span className="text-[rgb(var(--lo))]">/{a.maxPrimaryScore}</span>
                      </div>
                      <div className="text-[10px] text-[rgb(var(--mid))]">
                        прогноз ЕГЭ ~{a.forecastExpected}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}

function SubjectCard({
  subject,
  onStart,
  starting,
  disabled,
}: {
  subject: SubjectMeta;
  onStart: () => void;
  starting: boolean;
  disabled: boolean;
}) {
  const Icon = subject.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-[rgb(var(--bg-1))] p-5"
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[rgb(var(--bg-0))]"
          style={{ background: subject.hue }}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-[rgb(var(--hi))]">
            {subject.displayName}
          </div>
        </div>
      </div>

      <p className="mb-4 text-[12.5px] leading-snug text-[rgb(var(--mid))]">
        {subject.description}
      </p>

      <div className="mb-4 flex flex-wrap gap-3 text-[11px] text-[rgb(var(--lo))]">
        <span className="flex items-center gap-1">
          <Clock size={11} /> {subject.minutes} минут
        </span>
        <span>· {subject.taskCount} заданий</span>
        <span>· до {subject.maxScore} первичных</span>
      </div>

      <button
        onClick={onStart}
        disabled={disabled || starting}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-[rgb(var(--bg-0))] transition-transform hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        style={{ background: subject.hue }}
      >
        {starting ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Готовим вариант…
          </>
        ) : (
          <>
            Начать пробник <ArrowRight size={14} />
          </>
        )}
      </button>
    </motion.div>
  );
}
