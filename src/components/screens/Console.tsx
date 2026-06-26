"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { useApp } from "@/lib/store";
import { computeScore, bandColor } from "@/lib/score-model";
import { floorState } from "@/lib/floor-state";
import { overallReadiness } from "@/lib/floor-build";

export function Console() {
  const subject = useApp((s) => s.subject());
  const mode = useApp((s) => s.mode);
  const selectFloor = useApp((s) => s.selectFloor);
  const profile = useApp((s) => s.profile);

  const sc = computeScore(subject);
  const col = bandColor(sc.half);
  const ready = overallReadiness(subject.floors); // высота Шпиля = % готовности к ЕГЭ

  const weak = subject.floors
    .slice()
    .sort((a, b) => a.prog * 0.5 + a.stab * 0.5 - (b.prog * 0.5 + b.stab * 0.5))
    .filter((f) => floorState(f) !== "solid")
    .slice(0, 3);

  const gap = subject.goal - sc.mid;
  const fnote =
    sc.aS < 60
      ? `Шпиль высокий, но дрожит: разброс ±${sc.half} балла. Укрепи слабые зоны — диапазон сожмётся.`
      : gap > 0
      ? `До цели ${subject.goal} примерно +${gap}. Прогноз надёжный — продолжай в темпе.`
      : `Прогноз уверенно у цели ${subject.goal}. Держи стабильность до экзамена.`;

  if (mode === "parent") return null;

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 26 }}
      className="pointer-events-auto fixed bottom-[68px] left-3 z-[3] w-[330px] max-w-[calc(100%-24px)] md:bottom-[72px] md:left-4"
    >
      <LiquidGlass interactive className="p-4">
        {/* персональное приветствие — «от руки» */}
        <div className="mb-0.5 font-hand text-[17px] leading-none text-mid">
          С возвращением, <span className="text-accent">{profile.name}</span>!
        </div>
        <h2 className="m-0 mb-3 text-[13px] font-semibold text-hi">
          Готовность ·{" "}
          <em className="font-serif not-italic text-accent">{subject.name}</em>
        </h2>

        {/* метрики */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-line bg-white/[0.02] p-2.5">
            <div className="text-[22px] font-bold leading-none text-hi">
              {sc.solid}
              <small className="ml-0.5 text-[13px] font-normal text-lo">/{sc.total}</small>
            </div>
            <div className="mt-1 hud-label text-[8.5px] text-lo">Высота · этажи</div>
          </div>
          <div
            className="rounded-xl border bg-white/[0.02] p-2.5"
            style={{
              borderColor:
                sc.aS < 55 ? "rgba(255,92,110,.35)" : sc.aS >= 72 ? "rgba(91,227,176,.35)" : "rgba(132,156,200,.16)",
            }}
          >
            <div
              className="text-[22px] font-bold leading-none"
              style={{ color: sc.aS < 55 ? "#FF5C6E" : sc.aS >= 72 ? "#5BE3B0" : "#EAF0FC" }}
            >
              {sc.aS}
              <small className="ml-0.5 text-[13px] font-normal opacity-60">%</small>
            </div>
            <div className="mt-1 hud-label text-[8.5px] text-lo">Стабильность</div>
          </div>
        </div>

        {/* общая готовность к ЕГЭ = высота Шпиля */}
        <div className="mb-3 rounded-xl border border-line bg-white/[0.02] p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="hud-label text-[8.5px] text-lo">Готовность к ЕГЭ · высота Шпиля</span>
            <b className="font-mono text-[13px] text-accent">{ready}%</b>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent"
              animate={{ width: `${ready}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            />
          </div>
        </div>

        {/* прогноз-диапазон */}
        <div className="mb-3 rounded-xl border border-line bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="hud-label text-[9px] text-lo">Прогноз балла</span>
            <span className="font-mono text-[15px] font-bold" style={{ color: col }}>
              {sc.min}–{sc.max}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-white/5">
            <motion.div
              className="absolute top-0 h-full rounded-full"
              style={{ background: col }}
              animate={{ left: `${sc.min}%`, width: `${Math.max(2, sc.max - sc.min)}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-hi"
              style={{ left: `${subject.goal}%` }}
              title={`Цель ${subject.goal}`}
            />
          </div>
          <div
            className="mt-2 text-[11px] leading-snug text-mid"
            dangerouslySetInnerHTML={{ __html: fnote.replace(/(±\d+ балла|до цели \d+|\+?\d+)/gi, (m) => `<b class='text-hi'>${m}</b>`) }}
          />
        </div>

        {/* дрожащие зоны */}
        <div>
          <div className="mb-2 hud-label text-[9px] text-lo">
            Дрожащие зоны — нажми, чтобы укрепить
          </div>
          <div className="flex flex-wrap gap-1.5">
            {weak.length ? (
              weak.map((f) => (
                <button
                  key={f.id}
                  onClick={() => selectFloor(f.id, { zoom: profile.viewMode === "spire" })}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-mid transition-colors hover:border-accent/40 hover:text-hi"
                >
                  <Zap size={11} className="text-danger" />
                  {f.name}
                </button>
              ))
            ) : (
              <span className="text-[11px] text-lo">Все зоны устойчивы 🎯</span>
            )}
          </div>
        </div>
      </LiquidGlass>
    </motion.div>
  );
}
