"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, X, Sparkles, Timer, Send, Flame, Zap } from "lucide-react";
import { useApp } from "@/lib/store";
import { XP, comboMultiplier } from "@/lib/gamification";
import { computeScore, type ScoreResult } from "@/lib/score-model";
import { playCorrect, playWrong, playCombo } from "@/lib/sound";
import { buzz, HAPTIC } from "@/lib/haptics";
import { useToast } from "./Toast";
import { ResultsScreen, type MistakeItem } from "./ResultsScreen";

/**
 * Экран решения — намеренно ПЛОСКИЙ и БЫСТРЫЙ, без 3D.
 * Ничто не должно тормозить цикл практики (требование производительности).
 * Тестовая часть проверяется мгновенно алгоритмом (бесплатно).
 *
 * Задания тянутся с /api/tasks/floor — они сгенерированы через Claude
 * по кодификатору ФИПИ и лежат в таблице Task.
 */

type Task = { q: string; options: string[]; correct: number; hint: string; topicCode: string };

export function Solve() {
  const setScreen = useApp((s) => s.setScreen);
  const floor = useApp((s) => s.floorById(s.solveFloorId));
  const subject = useApp((s) => s.subject());
  const bump = useApp((s) => s.bump);
  const gainXp = useApp((s) => s.gainXp);
  const resetCombo = useApp((s) => s.resetCombo);
  const combo = useApp((s) => s.game.combo);
  const lightMode = useApp((s) => s.lightMode);
  const toast = useToast();
  const reduce = useReducedMotion();

  const [tasksList, setTasksList] = React.useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [idx, setIdx] = React.useState(0);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);
  const [seconds, setSeconds] = React.useState(0);
  const [sessionXp, setSessionXp] = React.useState(0); // XP, набранный именно за этот срез
  const [mistakes, setMistakes] = React.useState<MistakeItem[]>([]); // для «разбора ошибок»
  const [flash, setFlash] = React.useState<"correct" | "wrong" | null>(null);
  const [lastGain, setLastGain] = React.useState<{ id: number; amount: number } | null>(null);
  const gainSeq = React.useRef(0);
  const flashTimer = React.useRef<ReturnType<typeof setTimeout>>();

  // Снапшот «было/стало» для итогов: считается ОДИН раз при завершении сессии.
  // Без заморозки bump() из finish() менял subject, Solve ре-рендерился во время
  // exit-анимации экрана (AnimatePresence mode="wait" в page.tsx) — и цифры
  // прогноза прыгали на глазах (зачёт накладывался второй раз).
  const resultsSnap = React.useRef<{
    before: ScoreResult | null;
    projected: ScoreResult | null;
  } | null>(null);

  // сессия завершена → экран итогов: таймер замирает, снапшот заморожен
  const sessionOver = tasksList.length > 0 && idx >= tasksList.length;

  React.useEffect(() => {
    if (sessionOver) return; // на итогах время не тикает (и не дёргает ре-рендеры)
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [sessionOver]);

  // Загружаем задания по этажу
  React.useEffect(() => {
    if (!floor) return;
    setLoadingTasks(true);
    setLoadError(null);
    setIdx(0);
    setPicked(null);
    setScore(0);
    setSessionXp(0);
    setMistakes([]);
    setSeconds(0); // время прошлой сессии не протекает в новую
    resultsSnap.current = null; // новая сессия — новый снапшот прогноза

    fetch(`/api/tasks/floor?id=${encodeURIComponent(floor.id)}&limit=8`)
      .then((r) => r.json())
      .then((json: {
        tasks: { question: string; options: string[]; correct: number; explanation: string; topicCode: string }[];
      }) => {
        const mapped: Task[] = (json.tasks ?? []).map((t) => ({
          q: t.question,
          options: t.options,
          correct: t.correct,
          hint: t.explanation,
          topicCode: t.topicCode,
        }));
        setTasksList(mapped);
        if (mapped.length === 0) {
          setLoadError("По этой теме задания ещё готовятся. Загляни позже.");
        }
      })
      .catch(() => setLoadError("Не удалось загрузить задания. Проверь интернет."))
      .finally(() => setLoadingTasks(false));
  }, [floor?.id]);

  // чистим таймер вспышки при размонтировании
  React.useEffect(() => () => clearTimeout(flashTimer.current), []);

  const done = idx >= tasksList.length;
  const task = tasksList[idx];
  const answered = picked !== null;
  const correct = !!task && picked === task.correct;

  function choose(i: number) {
    if (answered || !task) return;
    setPicked(i);
    const ok = i === task.correct;
    if (ok) {
      setScore((s) => s + 1);
      const mult = comboMultiplier(combo + 1);
      const amount = Math.round(XP.correct * mult);
      gainXp(XP.correct, { correct: true });
      setSessionXp((x) => x + amount);
      setLastGain({ id: ++gainSeq.current, amount });
      setFlash("correct");
      playCorrect();
      if (combo + 1 >= 2) playCombo(combo + 1);
      // тактильный тик: обычный на верный, паттерн на комбо-веху (×3/×6/×9…)
      if (!reduce) buzz((combo + 1) % 3 === 0 ? HAPTIC.combo : HAPTIC.correct);
    } else {
      gainXp(XP.wrong, { resetCombo: true });
      setSessionXp((x) => x + XP.wrong);
      setMistakes((ms) => [
        ...ms,
        {
          code: task.topicCode,
          question: task.q,
          your: task.options[i],
          answer: task.options[task.correct],
          hint: task.hint,
        },
      ]);
      setLastGain({ id: ++gainSeq.current, amount: XP.wrong });
      setFlash("wrong");
      playWrong();
      if (!reduce) buzz(HAPTIC.wrong);
    }
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 600);
  }
  function nextTask() {
    if (idx < tasksList.length - 1) {
      setIdx((i) => i + 1);
      setPicked(null);
      setLastGain(null);
    } else {
      setIdx(tasksList.length); // done
    }
  }
  // Единая формула зачёта сессии — и для реального bump в finish(), и для
  // проекции прогноза на итогах. Менять только здесь, иначе разойдутся.
  function sessionGain() {
    const gained = Math.round((score / tasksList.length) * 18);
    return { gained, dStab: Math.round(gained * 0.6) };
  }
  function finish() {
    if (floor) {
      const { gained, dStab } = sessionGain();
      bump(floor.id, gained, dStab);
      gainXp(XP.trainComplete);
      toast(`Тренировка засчитана: <b>+${gained}</b> к освоению «${floor.name}».`);
    }
    resetCombo();
    setScreen("spire");
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  // Срез пройден → экран «Итоги тренировки» вместо инлайнового done-блока.
  if (done && !loadingTasks && !loadError && tasksList.length > 0) {
    // Прогноз ЕГЭ с учётом ЭТОЙ сессии: bump применится только в finish() (при
    // выходе с итогов), поэтому зачёт проецируем на копию этажей — иначе
    // диапазон показал бы состояние «до тренировки».
    if (!resultsSnap.current) {
      const { gained, dStab } = sessionGain();
      resultsSnap.current = {
        before: subject && floor ? computeScore(subject) : null,
        projected:
          subject && floor
            ? computeScore({
                ...subject,
                floors: subject.floors.map((f) =>
                  f.id === floor.id
                    ? {
                        ...f,
                        prog: Math.min(100, f.prog + gained),
                        stab: Math.min(100, f.stab + dStab),
                      }
                    : f
                ),
              })
            : null,
      };
    }
    const { before, projected } = resultsSnap.current;
    return (
      <ResultsScreen
        floorName={floor?.name ?? "Тренировка"}
        correct={score}
        total={tasksList.length}
        seconds={seconds}
        xpGained={sessionXp}
        mistakes={mistakes}
        scoreRange={projected ? { low: projected.min, high: projected.max } : undefined}
        scoreRangeBefore={before ? { low: before.min, high: before.max } : undefined}
        onNext={finish}
        // «к Шпилю» ТОЖЕ фиксирует результат (finish: bump+XP+toast+resetCombo),
        // раньше молча терял сессию
        onBack={finish}
        onAskTutor={(m) => {
          // зафиксировать сессию перед уходом к репетитору, иначе XP/комбо теряются
          finish();
          window.location.href = `/tutor?topic=${encodeURIComponent(m.code)}&subject=russian`;
        }}
      />
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-bg-0">
      {/* комбо-жар: янтарная виньетка по краям нарастает с серией
          (CSS-transition, 0 JS в кадре; гаснет в lightMode/reduce) */}
      {!lightMode && !reduce && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10"
          style={{
            opacity: Math.min(combo, 9) / 30,
            transition: "opacity 0.5s ease",
            background:
              "radial-gradient(120% 100% at 50% 50%, transparent 58%, rgb(var(--accent) / 0.5) 135%)",
          }}
        />
      )}

      {/* экранная вспышка — зелёная (верно) / мягкая красная (мимо) */}
      <AnimatePresence>
        {flash && !reduce && (
          <motion.div
            key={flash + gainSeq.current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-0 z-20"
            style={{
              background:
                flash === "correct"
                  ? "radial-gradient(circle at 50% 60%, rgba(91,227,176,.22), transparent 70%)"
                  : "radial-gradient(circle at 50% 60%, rgba(255,92,110,.18), transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* top bar — плоский, лёгкий */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg-0/85 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => setScreen("spire")}
          className="-ml-2 flex min-h-[44px] items-center gap-1.5 px-2 text-[13px] text-mid transition-colors hover:text-hi"
        >
          <ArrowLeft size={16} /> к Шпилю
        </button>
        <div className="text-center">
          <div className="text-[13px] font-semibold text-hi">{floor?.name || "Тренировка"}</div>
          <div className="font-mono text-[10px] text-lo">тестовая часть · проверка мгновенно</div>
        </div>
        <div className="flex items-center gap-2">
          {/* комбо-счётчик */}
          <AnimatePresence>
            {combo >= 2 && (
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                key={combo}
                className="flex items-center gap-1 rounded-full border border-danger/40 bg-danger/10 px-2 py-1"
                title={`Комбо ×${comboMultiplier(combo)}`}
              >
                <Flame size={13} className="text-danger" />
                <b className="text-[12px] text-hi">{combo}</b>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-1.5 font-mono text-[13px] text-mid">
            <Timer size={14} /> {mm}:{ss}
          </div>
        </div>
      </header>

      {/* progress */}
      <div className="h-1 w-full bg-white/5">
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${(Math.min(idx, tasksList.length) / tasksList.length) * 100}%` }}
        />
      </div>

      <main className="mx-auto max-w-[640px] px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] md:py-8">
        <AnimatePresence mode="wait">
          {loadingTasks ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 py-16 text-[13.5px] text-mid"
            >
              <Sparkles size={16} className="animate-pulse text-accent" />
              Подбираю задания из базы ФИПИ…
            </motion.div>
          ) : loadError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 rounded-2xl border border-line bg-white/[0.02] p-8 text-center"
            >
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-white/5">
                <Sparkles size={20} className="text-lo" />
              </div>
              <h3 className="mb-2 font-serif text-lg text-hi">{loadError}</h3>
              <p className="mb-6 text-[13px] leading-snug text-mid">
                Пока это готовится — задай вопрос ИИ-репетитору напрямую.
              </p>
              <button
                onClick={() => setScreen("spire")}
                className="rounded-xl border border-line px-5 py-2.5 text-[13px] text-hi transition-colors hover:bg-white/5"
              >
                Вернуться к Шпилю
              </button>
            </motion.div>
          ) : !done ? (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-lo">
                Задание {idx + 1} / {tasksList.length}
              </div>
              <h2 className="m-0 mb-6 text-xl font-medium leading-snug text-hi">{task.q}</h2>

              <div className="space-y-2.5">
                {task.options.map((o, i) => {
                  const isCorrect = answered && i === task.correct;
                  const isWrong = answered && i === picked && !correct;
                  const isPicked = i === picked;
                  return (
                    <motion.button
                      key={i}
                      onClick={() => choose(i)}
                      disabled={answered}
                      whileHover={!answered ? { scale: 1.01 } : undefined}
                      whileTap={!answered ? { scale: 0.985 } : undefined}
                      animate={
                        reduce
                          ? { scale: 1, x: 0 }
                          : isPicked && isCorrect
                          ? { scale: [1, 1.04, 1] }
                          : isWrong
                          ? { x: [0, -8, 8, -6, 6, 0] }
                          : { scale: 1, x: 0 }
                      }
                      transition={{ duration: isWrong ? 0.4 : 0.35 }}
                      className="focus-ring relative flex min-h-[52px] w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-[15px] disabled:cursor-default"
                      style={{
                        borderColor: isCorrect
                          ? "#5BE3B0"
                          : isWrong
                          ? "#FF5C6E"
                          : "rgb(var(--line) / var(--line-2a))",
                        background: isCorrect
                          ? "rgba(91,227,176,.10)"
                          : isWrong
                          ? "rgba(255,92,110,.10)"
                          : "rgb(var(--hi) / 0.035)",
                        color: "rgb(var(--hi))",
                        boxShadow: isCorrect ? "0 0 24px -6px rgba(91,227,176,.5)" : "none",
                      }}
                    >
                      <span>{o}</span>
                      {isCorrect && <Check size={18} className="text-stable" />}
                      {isWrong && <X size={18} className="text-danger" />}

                      {/* вылетающий +XP у выбранной кнопки */}
                      <AnimatePresence>
                        {isPicked && lastGain && (
                          <motion.div
                            key={lastGain.id}
                            initial={{ opacity: 0, y: 0, scale: 0.7 }}
                            animate={{ opacity: 1, y: -34, scale: 1 }}
                            exit={{ opacity: 0, y: -52 }}
                            transition={{ duration: 0.7 }}
                            className="pointer-events-none absolute right-3 top-1 flex items-center gap-0.5 font-mono text-[13px] font-bold"
                            style={{ color: correct ? "#5BE3B0" : "rgb(var(--mid))" }}
                          >
                            <Zap size={12} /> +{lastGain.amount}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {answered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden"
                  >
                    <div
                      className="mt-4 flex items-start gap-2.5 rounded-xl border p-3.5"
                      style={{
                        borderColor: correct ? "rgba(91,227,176,.3)" : "rgba(255,198,91,.3)",
                        background: correct ? "rgba(91,227,176,.05)" : "rgba(255,198,91,.05)",
                      }}
                    >
                      <Sparkles size={16} className="mt-0.5 shrink-0 text-accent" />
                      <div>
                        <div className="text-[13px] font-semibold text-hi">
                          {correct ? "Верно!" : "Не совсем — вот разбор:"}
                        </div>
                        <p className="m-0 mt-1 text-[13px] leading-snug text-mid">{task.hint}</p>
                      </div>
                    </div>
                    <button
                      onClick={nextTask}
                      className="glossy-btn focus-ring mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold"
                    >
                      {idx < tasksList.length - 1 ? "Следующее" : "Завершить"} <Send size={15} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
