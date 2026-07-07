"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Gauge, SkipForward } from "lucide-react";
import { useApp } from "@/lib/store";
import { LiquidGlass } from "@/components/ui/liquid-glass";

/**
 * Входной срез — самооценка уровня по нескольким темам (работает офлайн,
 * без банка заданий). Отмечает стартовые prog/stab этажей, чтобы Шпиль
 * стартовал с РЕАЛЬНОГО уровня, а не с нулей/демо-значений. Обещание
 * онбординга, реализованное честно и без зависимости от БД.
 */
const LEVELS = [
  { label: "Не знаю", prog: 0, stab: 0 },
  { label: "Слышал", prog: 22, stab: 16 },
  { label: "Норм", prog: 52, stab: 42 },
  { label: "Уверенно", prog: 82, stab: 70 },
] as const;

export function DiagnosticScreen() {
  const subject = useApp((s) => s.subject());
  const calibrate = useApp((s) => s.calibrate);
  const setScreen = useApp((s) => s.setScreen);

  // ~7 представительных тем, равномерно по всей башне
  const topics = React.useMemo(() => {
    const f = subject.floors;
    const n = Math.min(7, f.length);
    if (f.length <= n) return f;
    return Array.from({ length: n }, (_, i) => f[Math.round((i * (f.length - 1)) / (n - 1))]);
  }, [subject.floors]);

  // индекс уровня по id темы (по умолчанию — не оценено)
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const rated = topics.filter((t) => answers[t.id] != null).length;

  function build() {
    // оценённые темы калибруем; неоценённые оставляем как есть (не трогаем)
    topics.forEach((t) => {
      const idx = answers[t.id];
      if (idx == null) return;
      calibrate(t.id, LEVELS[idx].prog, LEVELS[idx].stab);
    });
    setScreen("format");
  }

  return (
    <div className="thin-scroll min-h-[100dvh] w-full overflow-y-auto bg-bg-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4">
        {/* заголовок */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-accent">
            <Gauge size={18} />
            <span className="hud-label text-[11px]">Входной срез</span>
          </div>
          <h1 className="m-0 mt-1 font-serif text-2xl text-hi">Что ты уже знаешь?</h1>
          <p className="m-0 mt-1.5 text-[13px] leading-snug text-mid">
            Оцени темы — Шпиль стартует с твоего уровня. Пропущенные останутся
            «не начатыми», их поднимешь в тренировках.
          </p>
        </motion.div>

        {/* прогресс среза */}
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgb(var(--hi)/0.08)]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent"
              animate={{ width: `${(rated / topics.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 160, damping: 22 }}
            />
          </div>
          <span className="shrink-0 font-mono text-[11px] text-mid">
            {rated}/{topics.length}
          </span>
        </div>

        {/* темы */}
        <div className="flex flex-col gap-2.5">
          {topics.map((t, i) => {
            const cur = answers[t.id];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
              >
                <LiquidGlass className="rounded-2xl p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: t.hue }}
                    />
                    <span className="text-[13.5px] font-semibold leading-tight text-hi">
                      {t.name}
                    </span>
                  </div>
                  <div
                    role="radiogroup"
                    aria-label={`Уровень: ${t.name}`}
                    className="grid grid-cols-4 gap-1.5"
                  >
                    {LEVELS.map((lvl, idx) => {
                      const on = cur === idx;
                      return (
                        <button
                          key={lvl.label}
                          role="radio"
                          aria-checked={on}
                          onClick={() => setAnswers((a) => ({ ...a, [t.id]: idx }))}
                          className="focus-ring flex min-h-[44px] items-center justify-center rounded-xl border px-1 text-center text-[11.5px] font-semibold leading-tight transition-colors"
                          style={{
                            borderColor: on ? "rgb(var(--accent))" : "rgb(var(--line)/0.4)",
                            background: on ? "rgb(var(--accent)/0.14)" : "rgb(var(--glass-hi)/0.02)",
                            color: on ? "rgb(var(--accent))" : "rgb(var(--mid))",
                          }}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </LiquidGlass>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="sticky bottom-0 mt-1 flex flex-col gap-2 bg-gradient-to-t from-bg-0 via-bg-0 to-transparent pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <button
            onClick={build}
            className="glossy-btn focus-ring flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold"
          >
            Построить Шпиль <ArrowRight size={16} />
          </button>
          <button
            onClick={() => setScreen("format")}
            className="focus-ring mx-auto flex min-h-[44px] items-center gap-1.5 rounded-md px-3 text-[12.5px] text-mid transition-colors hover:text-hi"
          >
            <SkipForward size={13} /> Пропустить срез
          </button>
        </div>
      </div>
    </div>
  );
}
