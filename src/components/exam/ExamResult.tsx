"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertTriangle,
  ChevronDown,
  Check,
  X as XIcon,
  Home,
  TrendingUp,
} from "lucide-react";
import { ExamResultActions } from "./ExamResultActions";

type TaskDetail = {
  taskNumber: number;
  question: string;
  options: string[];
  correctAnswer: number;
  userAnswer: number | null;
  isCorrect: boolean;
  primaryScore: number;
  earnedScore: number;
  explanation: string;
  topicId: string;
};

type ResultData = {
  attemptId: string;
  subjectKey: string;
  displayName: string;
  primaryScore: number;
  maxPrimaryScore: number;
  testScorePart1: number;
  forecast: { min: number; expected: number; max: number };
  secondsSpent: number;
  weakTopics: Array<{ topicId: string; ratio: number }>;
  details: TaskDetail[];
};

export function ExamResult({ attemptId }: { attemptId: string }) {
  const [data, setData] = React.useState<ResultData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [openTask, setOpenTask] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/exam/attempt/${attemptId}/result`, {
          credentials: "same-origin",
        });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setData(json);
          return;
        }
        // Попытка ещё не финализирована — финализируем и используем ответ
        const finalizeRes = await fetch("/api/exam/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ attemptId }),
        });
        const json = await finalizeRes.json();
        if (!finalizeRes.ok) throw new Error(json.error || "Не удалось получить результат");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  if (error) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[rgb(var(--bg-0))] px-4 text-center">
        <div>
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <p className="mb-4 text-[14px] text-[rgb(var(--mid))]">{error}</p>
          <a href="/exam" className="text-[13px] text-[rgb(var(--accent))] underline">
            Вернуться к выбору предмета
          </a>
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

  const minutes = Math.floor(data.secondsSpent / 60);
  const seconds = data.secondsSpent % 60;

  return (
    <div className="min-h-[100dvh] bg-[rgb(var(--bg-0))] pb-16">
      <header className="flex items-center justify-between border-b border-white/5 px-3 py-3 sm:px-6">
        <a
          href="/exam"
          className="flex min-h-[44px] items-center gap-2 text-sm text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))]"
        >
          <Home className="h-4 w-4" /> К пробникам
        </a>
        <div className="truncate text-[13px] font-medium text-[rgb(var(--hi))]">{data.displayName}</div>
        <div className="w-24" />
      </header>

      <div className="mx-auto max-w-3xl px-3 pt-8 sm:px-6">
        {/* Крупный балл */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl border border-white/10 bg-[rgb(var(--bg-1))] p-6 text-center"
        >
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-[rgb(var(--lo))]">
            Балл первой части
          </div>
          <div className="font-serif text-4xl text-[rgb(var(--hi))] sm:text-5xl">
            {data.primaryScore}
            <span className="text-2xl text-[rgb(var(--lo))] sm:text-3xl"> из {data.maxPrimaryScore}</span>
          </div>
          <div className="mt-2 text-[12.5px] text-[rgb(var(--mid))]">
            ≈ {data.testScorePart1} тестовых баллов за 1-ю часть · {minutes} мин {seconds} сек
          </div>
        </motion.div>

        {/* Прогноз */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 flex items-center gap-4 rounded-2xl border border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent))]/10 p-5"
        >
          <TrendingUp className="h-7 w-7 shrink-0 text-[rgb(var(--accent))]" />
          <div>
            <div className="text-[13px] font-medium text-[rgb(var(--hi))]">
              Итоговый балл ЕГЭ: {data.forecast.min}-{data.forecast.max}, ожидается {data.forecast.expected}
            </div>
            <div className="mt-0.5 text-[11.5px] text-[rgb(var(--mid))]">
              Прогноз с учётом среднего результата 2-й части — на реальном экзамене может отличаться.
            </div>
          </div>
        </motion.div>

        {/* Слабые темы */}
        {data.weakTopics.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
              Слабые темы
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.weakTopics.map((t) => (
                <span
                  key={t.topicId}
                  className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-mono text-[11px] text-red-300"
                >
                  {t.topicId} · {Math.round(t.ratio * 100)}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Разбор заданий */}
        <div className="mb-8">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
            Разбор заданий
          </h2>
          <div className="space-y-2">
            {data.details.map((d) => (
              <div
                key={d.taskNumber}
                className="overflow-hidden rounded-xl border border-white/10 bg-[rgb(var(--bg-1))]"
              >
                <button
                  onClick={() => setOpenTask((prev) => (prev === d.taskNumber ? null : d.taskNumber))}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                    style={{
                      background: d.isCorrect ? "rgba(91,227,176,0.15)" : "rgba(242,107,91,0.15)",
                      color: d.isCorrect ? "#5BE3B0" : "#F26B5B",
                    }}
                  >
                    {d.isCorrect ? <Check size={14} /> : <XIcon size={14} />}
                  </span>
                  <span className="flex-1 truncate text-[13px] text-[rgb(var(--hi))]">
                    Задание {d.taskNumber}
                  </span>
                  <span className="font-mono text-[11px] text-[rgb(var(--lo))]">
                    {d.earnedScore}/{d.primaryScore}
                  </span>
                  <ChevronDown
                    size={14}
                    className="text-[rgb(var(--lo))] transition-transform"
                    style={{ transform: openTask === d.taskNumber ? "rotate(180deg)" : undefined }}
                  />
                </button>

                {openTask === d.taskNumber && (
                  <div className="border-t border-white/5 px-4 py-3 text-[13px]">
                    <p className="mb-3 whitespace-pre-wrap break-words text-[rgb(var(--mid))]">{d.question}</p>
                    <div className="mb-3 space-y-1.5">
                      {d.options.map((opt, idx) => {
                        const isCorrectOpt = idx === d.correctAnswer;
                        const isUserOpt = idx === d.userAnswer;
                        return (
                          <div
                            key={idx}
                            className="break-words rounded-lg border px-3 py-2 text-[12.5px]"
                            style={{
                              borderColor: isCorrectOpt
                                ? "rgba(91,227,176,0.5)"
                                : isUserOpt
                                  ? "rgba(242,107,91,0.5)"
                                  : "rgba(255,255,255,0.08)",
                              background: isCorrectOpt
                                ? "rgba(91,227,176,0.08)"
                                : isUserOpt
                                  ? "rgba(242,107,91,0.08)"
                                  : "transparent",
                              color: isCorrectOpt || isUserOpt ? "rgb(var(--hi))" : "rgb(var(--mid))",
                            }}
                          >
                            {String.fromCharCode(65 + idx)}. {opt}
                            {isCorrectOpt && <span className="ml-2 text-[10px] text-[#5BE3B0]">верно</span>}
                            {isUserOpt && !isCorrectOpt && (
                              <span className="ml-2 text-[10px] text-[#F26B5B]">твой ответ</span>
                            )}
                          </div>
                        );
                      })}
                      {d.userAnswer === null && (
                        <div className="text-[11.5px] text-[rgb(var(--lo))]">Ответ не дан</div>
                      )}
                    </div>
                    {d.explanation && (
                      <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] leading-relaxed text-[rgb(var(--mid))]">
                        {d.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <ExamResultActions attemptId={attemptId} subjectKey={data.subjectKey} />
      </div>
    </div>
  );
}
