"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Check, Target, ListChecks,
  Languages, Sigma, Atom, Binary, Scale, BookOpenText, Lock, type LucideIcon,
} from "lucide-react";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { useApp } from "@/lib/store";
import { CARDS } from "@/data/catalog";

const ICONS: Record<string, LucideIcon> = { Languages, Sigma, Atom, Binary, Scale, BookOpenText };

const STEPS = ["Предмет", "Целевой балл", "Входной срез"] as const;

export function Onboarding() {
  const setScreen = useApp((s) => s.setScreen);
  const setSubject = useApp((s) => s.setSubject);
  const subjectKey = useApp((s) => s.subjectKey);

  const [step, setStep] = React.useState(0);
  const [goal, setGoal] = React.useState(80);

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else setScreen("format"); // после онбординга — выбор формата (Шпиль/Тропа)
  }
  function back() {
    if (step > 0) setStep((s) => s - 1);
    else setScreen("landing");
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-bg-0 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgb(var(--accent) / 0.10), transparent 70%), radial-gradient(50% 40% at 50% 100%, rgba(91,227,176,.06), transparent 70%)",
        }}
      />

      <LiquidGlass sheen className="z-10 w-full max-w-[460px] overflow-hidden p-6 md:p-8">
        {/* stepper */}
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div
                  className="grid h-6 w-6 place-items-center rounded-full font-mono text-[11px] font-bold transition-colors"
                  style={{
                    background: i <= step ? "rgb(var(--accent))" : "rgb(var(--hi) / 0.06)",
                    color: i <= step ? "#0a0e18" : "rgb(var(--lo))",
                  }}
                >
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span
                  className="hidden text-[11px] hud-label sm:block"
                  style={{ color: i <= step ? "rgb(var(--hi))" : "rgb(var(--lo))" }}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-line" />}
            </React.Fragment>
          ))}
        </div>

        {/* на мобиле названия шагов скрыты у точек — показываем текущий явно */}
        <div className="mb-4 hud-label text-[11px] text-mid sm:hidden">
          Шаг {step + 1}/{STEPS.length} · {STEPS[step]}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && (
              <>
                <h2 className="m-0 mb-1 font-serif text-2xl text-hi">Выбери предмет</h2>
                <p className="m-0 mb-5 text-[13px] text-mid">
                  Шпиль построится под структуру именно этого экзамена. Новые
                  предметы подключаются постоянно.
                </p>
                <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                  {CARDS.map((c) => {
                    const Icon = ICONS[c.icon] ?? Languages;
                    const live = c.status === "live";
                    const active = live && subjectKey === c.key;
                    return (
                      <button
                        key={c.key}
                        onClick={() => live && setSubject(c.key)}
                        disabled={!live}
                        className="group relative rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed"
                        style={{
                          borderColor: active ? "rgb(var(--accent))" : "rgba(132,156,200,.18)",
                          background: active ? "rgb(var(--accent) / .08)" : "rgba(255,255,255,.02)",
                          opacity: live ? 1 : 0.55,
                        }}
                      >
                        {!live && (
                          <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md border border-line bg-bg-0/60 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-mid">
                            <Lock size={9} /> скоро
                          </span>
                        )}
                        <Icon size={26} className={active ? "text-accent" : "text-mid"} />
                        <div className="mt-2 text-[14px] font-semibold text-hi">{c.short}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-mid">
                          {c.topics} тем · {c.exam.toUpperCase()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="mb-2 flex items-center gap-2 text-accent">
                  <Target size={18} />
                  <span className="hud-label text-[11px]">Целевой балл</span>
                </div>
                <h2 className="m-0 mb-1 font-serif text-2xl text-hi">Куда целимся?</h2>
                <p className="m-0 mb-6 text-[13px] text-mid">
                  Цель — отметка на Шпиле. Темп и план посчитаются от неё.
                </p>
                <div className="mb-2 text-center">
                  <span className="font-mono text-5xl font-bold text-accent">{goal}</span>
                  <span className="ml-1 text-lg text-lo">/100</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={goal}
                  onChange={(e) => setGoal(+e.target.value)}
                  // touch-action:none — драг ползунка не скроллит страницу;
                  // py увеличивает зону захвата на тач
                  className="w-full py-3.5 accent-[rgb(var(--accent))]"
                  style={{ touchAction: "none" }}
                />
                <div className="mt-1 flex justify-between font-mono text-[11px] text-mid">
                  <span>порог</span>
                  <span>бюджет</span>
                  <span>топ-вуз</span>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="mb-2 flex items-center gap-2 text-accent">
                  <ListChecks size={18} />
                  <span className="hud-label text-[11px]">Входной срез</span>
                </div>
                <h2 className="m-0 mb-1 font-serif text-2xl text-hi">10–15 заданий</h2>
                <p className="m-0 mb-5 text-[13px] leading-relaxed text-mid">
                  Быстрый срез по темам, чтобы стартовые этажи Шпиля отражали{" "}
                  <em className="not-italic text-hi">реальный уровень</em>, а не нули. Займёт ~7 минут.
                </p>
                <div className="space-y-2">
                  {["Тестовая часть — мгновенно и алгоритмом", "Один развёрнутый ответ — для калибровки", "Сразу видишь свой первый Шпиль"].map(
                    (t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 rounded-lg border border-line bg-white/[0.02] px-3 py-2.5 text-[12.5px] text-mid"
                      >
                        <Check size={15} className="shrink-0 text-stable" />
                        {t}
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* nav */}
        <div className="mt-7 flex items-center justify-between">
          <button
            onClick={back}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] text-mid transition-colors hover:text-hi"
          >
            <ArrowLeft size={15} /> Назад
          </button>
          <button
            onClick={next}
            className="glossy-btn flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold"
          >
            {step < STEPS.length - 1 ? "Дальше" : "Построить Шпиль"}
            <ArrowRight size={16} />
          </button>
        </div>
      </LiquidGlass>
    </div>
  );
}
