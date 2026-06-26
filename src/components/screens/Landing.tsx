"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { PixelCanvas } from "./PixelCanvas";
import { AnimatedLayerButton } from "@/components/ui/animated-layer-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useApp } from "@/lib/store";

const MARQUEE = [
  ["serif", "Сочинение"],
  ["sans", "Задача с параметром"],
  ["mono", "Развёрнутый ответ"],
  ["sans", "Пунктуация"],
  ["serif", "Геометрия"],
  ["mono", "Функции"],
  ["sans", "Вероятность"],
  ["serif", "Изложение"],
] as const;

function Marquee() {
  const items = (
    <div className="flex shrink-0 items-center gap-8 px-4">
      {MARQUEE.map(([f, t], i) => (
        <span
          key={i}
          className={
            "text-[13px] uppercase tracking-[0.18em] text-lo " +
            (f === "serif" ? "font-serif italic" : f === "mono" ? "font-mono" : "font-sans")
          }
        >
          {t}
        </span>
      ))}
    </div>
  );
  return (
    <div className="relative w-full overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div className="flex w-max animate-[marq_28s_linear_infinite]">
        {items}
        {items}
      </div>
      <style>{`@keyframes marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

export function Landing() {
  const setScreen = useApp((s) => s.setScreen);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-4 py-9 md:gap-6 md:px-6">
      {/* pixel bg + vignette */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <PixelCanvas />
        <div
          className="absolute inset-0 opacity-[0.82]"
          style={{
            background:
              "radial-gradient(circle at center, transparent 0%, rgb(var(--bg-0)) 100%)",
          }}
        />
      </div>

      {/* переключатель темы */}
      <div className="absolute right-4 top-4 z-20 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      {/* headline */}
      <div className="pointer-events-none z-10 flex w-full flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 font-mono text-[11px] uppercase tracking-[0.34em] text-lo"
        >
          ЕГЭ · ОГЭ · <b className="font-bold text-accent">честный чит-код</b>
        </motion.div>

        <h1
          className="m-0 flex w-full flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 leading-[0.96]"
          style={{ fontSize: "clamp(2.7rem, 9.2vw, 8.2rem)" }}
        >
          <span className="glass-text font-serif font-medium italic">Взломай</span>
          <span className="glass-text font-sans font-extrabold tracking-[-0.03em]">экзамен.</span>
        </h1>
      </div>

      {/* description */}
      <div className="z-10 mt-6 flex w-full flex-col items-center px-1 text-center md:mt-0">
        <p
          className="m-0 max-w-[min(92%,40rem)] font-light leading-relaxed text-hi/[0.86]"
          style={{ fontSize: "clamp(.95rem, 2.6vw, 1.22rem)" }}
        >
          ИИ-репетитор показывает, <em className="font-medium not-italic text-hi">как именно тебя оценят</em> по
          критериям ФИПИ, и докручивает ответ до максимального балла — круглосуточно и за копейки.
        </p>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={loaded ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9 }}
        className="z-10 mt-5 flex flex-row flex-wrap items-center justify-center gap-3 md:mt-9"
      >
        <AnimatedLayerButton onClick={() => setScreen("onboarding")}>
          Построить Шпиль
        </AnimatedLayerButton>
        <button
          onClick={() => setScreen("spire")}
          className="flex h-[46px] items-center gap-2 rounded-[13px] border border-line bg-[rgb(var(--hi)/0.04)] px-6 text-sm font-semibold text-hi backdrop-blur-md transition-colors hover:bg-[rgb(var(--hi)/0.08)]"
        >
          <Play size={15} /> Демо без регистрации
        </button>
      </motion.div>

      {/* marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={loaded ? { opacity: 1 } : {}}
        transition={{ delay: 0.4, duration: 1 }}
        className="z-10 mt-8 w-full md:absolute md:bottom-8 md:mt-0"
      >
        <Marquee />
      </motion.div>
    </section>
  );
}
