"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  X,
  Pause,
  Play,
  Send,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { ExamTimer } from "./ExamTimer";
import { ExamTaskNav } from "./ExamTaskNav";
import { MathText } from "@/components/MathText";

type ExamTask = {
  taskNumber: number;
  description: string;
  question: string;
  options: string[];
  primaryScore: number;
};

type AttemptState = {
  attemptId: string;
  subjectKey: string;
  displayName: string;
  durationMinutes: number;
  maxPrimaryScore: number;
  startedAt: string;
  pausedAt: string | null;
  pausedMillis: number;
  status: string;
  tasks: ExamTask[];
  answers: Record<number, number | null>;
};

export function ExamRunner({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [state, setState] = React.useState<AttemptState | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [currentTask, setCurrentTask] = React.useState(1);
  const [answers, setAnswers] = React.useState<Record<number, number | null>>({});
  const [pauseBusy, setPauseBusy] = React.useState(false);
  const [finalizing, setFinalizing] = React.useState(false);
  const [confirmSubmit, setConfirmSubmit] = React.useState(false);

  const saveTimers = React.useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const finalizedRef = React.useRef(false);

  // Загрузка состояния попытки
  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/exam/attempt/${attemptId}`, { credentials: "same-origin" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Не удалось загрузить пробник");
        return data as AttemptState;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.status === "finished") {
          router.replace(`/exam/${attemptId}/result`);
          return;
        }
        setState(data);
        setAnswers(data.answers ?? {});
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [attemptId, router]);

  const isPaused = !!state?.pausedAt;

  async function saveAnswer(taskNumber: number, answer: number | null) {
    try {
      await fetch("/api/exam/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ attemptId, taskNumber, answer }),
      });
    } catch {
      // тихо — следующий выбор попробует снова, критично только при финализации
    }
  }

  function selectAnswer(taskNumber: number, optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [taskNumber]: optionIndex }));
    const timers = saveTimers.current;
    if (timers[taskNumber]) clearTimeout(timers[taskNumber]);
    timers[taskNumber] = setTimeout(() => saveAnswer(taskNumber, optionIndex), 300);
  }

  async function togglePause() {
    if (!state || pauseBusy) return;
    setPauseBusy(true);
    try {
      const res = await fetch("/api/exam/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ attemptId, action: isPaused ? "resume" : "start" }),
      });
      const data = await res.json();
      if (res.ok) {
        setState((prev) =>
          prev ? { ...prev, pausedAt: data.pausedAt, pausedMillis: data.pausedMillis } : prev
        );
      }
    } finally {
      setPauseBusy(false);
    }
  }

  const finalize = React.useCallback(async () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    setFinalizing(true);
    try {
      await fetch("/api/exam/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ attemptId }),
      });
    } finally {
      router.replace(`/exam/${attemptId}/result`);
    }
  }, [attemptId, router]);

  function handleExpire() {
    if (isPaused) return; // на паузе таймер не должен триггерить финализацию
    finalize();
  }

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

  if (!state) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[rgb(var(--bg-0))]">
        <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--accent))]" />
      </div>
    );
  }

  const task = state.tasks.find((t) => t.taskNumber === currentTask) ?? state.tasks[0];
  const answeredNumbers = new Set(
    Object.entries(answers)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k]) => Number(k))
  );
  const answeredCount = answeredNumbers.size;

  return (
    <div className="min-h-[100dvh] bg-[rgb(var(--bg-0))] pb-8">
      {/* Шапка */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-[rgb(var(--bg-0))]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-[rgb(var(--hi))]">
              {state.displayName}
            </div>
            <div className="truncate text-[11px] text-[rgb(var(--lo))]">
              {answeredCount} из {state.tasks.length} отвечено
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ExamTimer
              startedAt={state.startedAt}
              durationMinutes={state.durationMinutes}
              pausedAt={state.pausedAt}
              pausedMillis={state.pausedMillis}
              onExpire={handleExpire}
            />
            <button
              onClick={togglePause}
              disabled={pauseBusy}
              aria-label={isPaused ? "Продолжить" : "Пауза"}
              title={isPaused ? "Продолжить" : "Пауза"}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))] disabled:opacity-50"
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={() => setConfirmSubmit(true)}
              aria-label="Сдать"
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[rgb(var(--accent))] px-2.5 text-[12.5px] font-semibold text-[rgb(var(--bg-0))] transition hover:brightness-110 sm:px-3"
            >
              <Send size={14} /> <span className="hidden sm:inline">Сдать</span>
            </button>
          </div>
        </div>
      </header>

      {isPaused ? (
        <div className="mx-auto mt-16 max-w-md px-3 text-center sm:px-4">
          <Pause className="mx-auto mb-3 h-8 w-8 text-[rgb(var(--accent))]" />
          <h2 className="mb-2 text-[16px] font-semibold text-[rgb(var(--hi))]">
            Пробник на паузе
          </h2>
          <p className="mb-5 text-[13px] text-[rgb(var(--mid))]">
            Таймер остановлен. Нажми «Продолжить», когда будешь готов.
          </p>
          <button
            onClick={togglePause}
            disabled={pauseBusy}
            className="mx-auto flex min-h-[44px] items-center gap-2 rounded-xl bg-[rgb(var(--accent))] px-5 py-2.5 text-[13px] font-semibold text-[rgb(var(--bg-0))] transition hover:brightness-110 disabled:opacity-50"
          >
            {pauseBusy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Продолжить
          </button>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl px-3 pt-4 sm:px-4">
          {/* Навигация по заданиям */}
          <div className="mb-4">
            <ExamTaskNav
              taskCount={state.tasks.length}
              currentTask={currentTask}
              answeredNumbers={answeredNumbers}
              onSelect={setCurrentTask}
            />
          </div>

          {/* Задание */}
          {task && (
            <AnimatePresence mode="wait">
              <motion.div
                key={task.taskNumber}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="rounded-2xl border border-white/10 bg-[rgb(var(--bg-1))] p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wide text-[rgb(var(--lo))]">
                    Задание {task.taskNumber} · {task.primaryScore}{" "}
                    {task.primaryScore === 1 ? "балл" : "балла"}
                  </span>
                </div>
                {task.description && (
                  <MathText as="div" className="mb-3 break-words text-[12px] text-[rgb(var(--mid))]">{task.description}</MathText>
                )}
                <MathText as="p" className="mb-5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[rgb(var(--hi))]">
                  {task.question}
                </MathText>

                <div className="space-y-2">
                  {task.options.map((option, idx) => {
                    const selected = answers[task.taskNumber] === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => selectAnswer(task.taskNumber, idx)}
                        className="flex min-h-[44px] w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-[13.5px] transition"
                        style={{
                          borderColor: selected ? "rgb(var(--accent))" : "rgba(255,255,255,0.1)",
                          background: selected ? "rgb(var(--accent) / 0.12)" : "rgba(255,255,255,0.02)",
                          color: selected ? "rgb(var(--hi))" : "rgb(var(--mid))",
                        }}
                      >
                        <span
                          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border font-mono text-[10px]"
                          style={{
                            borderColor: selected ? "rgb(var(--accent))" : "rgba(255,255,255,0.2)",
                            color: selected ? "rgb(var(--accent))" : "rgb(var(--lo))",
                          }}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <MathText as="span" className="break-words">{option}</MathText>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Далее / Назад */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentTask((n) => Math.max(1, n - 1))}
              disabled={currentTask <= 1}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[13px] text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))] disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Назад
            </button>
            <button
              onClick={() => setCurrentTask((n) => Math.min(state.tasks.length, n + 1))}
              disabled={currentTask >= state.tasks.length}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[13px] text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))] disabled:opacity-30"
            >
              Далее <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Подтверждение сдачи */}
      <AnimatePresence>
        {confirmSubmit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 grid place-items-center bg-black/60 px-4"
            onClick={() => !finalizing && setConfirmSubmit(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[rgb(var(--bg-1))] p-5"
            >
              <h3 className="mb-2 text-[15px] font-semibold text-[rgb(var(--hi))]">
                Сдать пробник?
              </h3>
              <p className="mb-5 text-[13px] text-[rgb(var(--mid))]">
                Отвечено {answeredCount} из {state.tasks.length} заданий. После сдачи изменить
                ответы будет нельзя.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmSubmit(false)}
                  disabled={finalizing}
                  className="min-h-[44px] flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-[13px] text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))] disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  onClick={finalize}
                  disabled={finalizing}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--accent))] px-4 py-2.5 text-[13px] font-semibold text-[rgb(var(--bg-0))] transition hover:brightness-110 disabled:opacity-50"
                >
                  {finalizing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  Сдать
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
