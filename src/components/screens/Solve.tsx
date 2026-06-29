"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, X, Sparkles, Timer, Camera, Send, Flame, Zap } from "lucide-react";
import { useApp } from "@/lib/store";
import { XP, comboMultiplier } from "@/lib/gamification";
import { playCorrect, playWrong, playCombo } from "@/lib/sound";
import { useToast } from "./Toast";

/**
 * Экран решения — намеренно ПЛОСКИЙ и БЫСТРЫЙ, без 3D.
 * Ничто не должно тормозить цикл практики (требование производительности).
 * Тестовая часть проверяется мгновенно алгоритмом (бесплатно).
 */

// иллюстративный набор тестовых заданий
const TASKS: Record<string, { q: string; options: string[]; correct: number; hint: string }[]> = {
  default: [
    {
      q: "В каком слове верно выделена буква, обозначающая ударный гласный звук?",
      options: ["звонИт", "тОрты", "красивЕе", "договОр"],
      correct: 0,
      hint: "«ЗвонИт» — ударение всегда на последний слог в личных формах глагола.",
    },
    {
      q: "Укажите вариант, где НЕ со словом пишется слитно.",
      options: ["(не)законченный вовремя", "(не)брежно", "(не)кто иной", "далеко (не)лёгкий"],
      correct: 1,
      hint: "«Небрежно» — наречие без противопоставления и зависимых слов пишется слитно.",
    },
    {
      q: "В каком предложении нужна одна запятая? (знаки не расставлены)",
      options: [
        "Шёл дождь и дул ветер",
        "Налетел ветер и сорвал листья",
        "Мокрый снег падал и таял",
        "Гром гремел а молнии сверкали",
      ],
      correct: 3,
      hint: "Перед противительным союзом «а» в сложносочинённом предложении ставится запятая.",
    },
  ],
};

export function Solve() {
  const setScreen = useApp((s) => s.setScreen);
  const floor = useApp((s) => s.floorById(s.solveFloorId));
  const bump = useApp((s) => s.bump);
  const gainXp = useApp((s) => s.gainXp);
  const resetCombo = useApp((s) => s.resetCombo);
  const combo = useApp((s) => s.game.combo);
  const toast = useToast();

  const tasks = TASKS.default;
  const [idx, setIdx] = React.useState(0);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);
  const [seconds, setSeconds] = React.useState(0);
  const [flash, setFlash] = React.useState<"correct" | "wrong" | null>(null);
  const [lastGain, setLastGain] = React.useState<{ id: number; amount: number } | null>(null);
  const gainSeq = React.useRef(0);
  const flashTimer = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // чистим таймер вспышки при размонтировании
  React.useEffect(() => () => clearTimeout(flashTimer.current), []);

  const done = idx >= tasks.length;
  const task = tasks[idx];
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
      setLastGain({ id: ++gainSeq.current, amount });
      setFlash("correct");
      playCorrect();
      if (combo + 1 >= 2) playCombo(combo + 1);
    } else {
      gainXp(XP.wrong, { resetCombo: true });
      setLastGain({ id: ++gainSeq.current, amount: XP.wrong });
      setFlash("wrong");
      playWrong();
    }
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 600);
  }
  function nextTask() {
    if (idx < tasks.length - 1) {
      setIdx((i) => i + 1);
      setPicked(null);
      setLastGain(null);
    } else {
      setIdx(tasks.length); // done
    }
  }
  function finish() {
    if (floor) {
      const gained = Math.round((score / tasks.length) * 18);
      bump(floor.id, gained, Math.round(gained * 0.6));
      gainXp(XP.trainComplete);
      toast(`Тренировка засчитана: <b>+${gained}</b> к освоению «${floor.name}».`);
    }
    resetCombo();
    setScreen("spire");
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-bg-0">
      {/* экранная вспышка — зелёная (верно) / мягкая красная (мимо) */}
      <AnimatePresence>
        {flash && (
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
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
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
          animate={{ width: `${(Math.min(idx, tasks.length) / tasks.length) * 100}%` }}
        />
      </div>

      <main
        className="mx-auto max-w-[640px] px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] md:py-8"
        style={{
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <div className="mb-1 font-mono text-[11px] uppercase tracking-wide text-lo">
                Задание {idx + 1} / {tasks.length}
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
                        isPicked && isCorrect
                          ? { scale: [1, 1.04, 1] }
                          : isWrong
                          ? { x: [0, -8, 8, -6, 6, 0] }
                          : { scale: 1, x: 0 }
                      }
                      transition={{ duration: isWrong ? 0.4 : 0.35 }}
                      className="relative flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-[15px] disabled:cursor-default"
                      style={{
                        borderColor: isCorrect
                          ? "#5BE3B0"
                          : isWrong
                          ? "#FF5C6E"
                          : "rgba(132,156,200,.18)",
                        background: isCorrect
                          ? "rgba(91,227,176,.10)"
                          : isWrong
                          ? "rgba(255,92,110,.10)"
                          : "rgba(255,255,255,.02)",
                        color: "#EAF0FC",
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
                            style={{ color: correct ? "#5BE3B0" : "#9FB0CF" }}
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
                      className="glossy-btn mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold"
                    >
                      {idx < tasks.length - 1 ? "Следующее" : "Завершить"} <Send size={15} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-accent/40 bg-accent/10">
                <Check size={32} className="text-accent" />
              </div>
              <h2 className="m-0 font-serif text-2xl text-hi">Срез завершён</h2>
              <p className="m-0 mt-2 text-[14px] text-mid">
                Верно <b className="text-hi">{score}</b> из {tasks.length}. Этаж «{floor?.name}»
                подрос — диапазон прогноза станет точнее.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={finish}
                  className="glossy-btn flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold"
                >
                  Учесть и вернуться к Шпилю <ArrowLeft size={15} />
                </button>
                {floor?.boss && (
                  <div className="mt-1 flex items-center justify-center gap-2 text-[12px] text-lo">
                    <Camera size={13} /> Развёрнутый ответ можно загрузить фото или текстом
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
