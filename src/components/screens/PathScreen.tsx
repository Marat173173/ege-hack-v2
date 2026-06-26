"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Lock, Check, Star, BookOpen, Crown, Dumbbell } from "lucide-react";
import { useApp } from "@/lib/store";
import { floorState, STATE_META } from "@/lib/floor-state";
import { isLocked, unlockGap, floorReadiness } from "@/lib/floor-build";
import { useToast } from "./Toast";
import type { Floor } from "@/data/types";

/**
 * «Тропа путешественника» — горизонтально-вертикальная змейка узлов-тем,
 * как карта приключения в Duolingo. Те же данные/гейтинг, что и у Шпиля,
 * только 2D-вид. Узлы открываются снизу вверх; заблокированные — с замком.
 */

const NODE_GAP = 116; // расстояние между узлами по вертикали
const AMP = 92; // амплитуда «змейки» по горизонтали

function nodeIcon(f: Floor, st: ReturnType<typeof floorState>) {
  if (f.boss) return Crown;
  if (st === "solid") return Check;
  if (st === "ghost" || st === "forming") return BookOpen;
  return Star;
}

export function PathScreen() {
  const subject = useApp((s) => s.subject());
  const selectFloor = useApp((s) => s.selectFloor);
  const openModal = useApp((s) => s.openModal);
  const toast = useToast();

  const floors = subject.floors;
  // тропа идёт снизу вверх — реверсим для рендера (вверху — вершина/босс)
  const ordered = floors.map((f, i) => ({ f, i })).reverse();

  function tap(f: Floor, i: number) {
    if (isLocked(floors, i)) {
      toast(
        `🔒 «${f.name}» закрыт. Укрепи нижние темы ещё на <b>~${unlockGap(floors, i)}%</b>.`
      );
      return;
    }
    selectFloor(f.id, { zoom: false });
  }

  return (
    <div className="thin-scroll absolute inset-0 overflow-y-auto pb-[160px] pt-[76px] md:pb-8 md:pt-[92px]">
      {/* заголовок-баннер раздела (как у Duolingo) */}
      <div className="mx-auto mb-2 max-w-[560px] px-4">
        <div className="rounded-2xl border border-accent/40 bg-accent/[0.08] px-5 py-4">
          <div className="hud-label text-[9px] text-accent">Тропа · {subject.name}</div>
          <h2 className="m-0 mt-1 font-serif text-xl text-hi">Путь к экзамену</h2>
          <p className="m-0 mt-1 text-[12px] text-mid">
            Идём снизу вверх: каждая укреплённая тема открывает следующую.
          </p>
        </div>
      </div>

      {/* змейка узлов */}
      <div
        className="relative mx-auto w-full max-w-[560px]"
        style={{ height: floors.length * NODE_GAP + 120 }}
      >
        {/* соединительная линия */}
        <svg
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
          viewBox={`0 0 100 ${floors.length * NODE_GAP + 120}`}
          preserveAspectRatio="none"
        >
          <path
            d={pathLine(floors.length)}
            fill="none"
            stroke="rgb(var(--glass-hi) / 0.16)"
            strokeWidth="1.2"
            strokeDasharray="2 5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {ordered.map(({ f, i }, renderIdx) => {
          const st = floorState(f);
          const locked = isLocked(floors, i);
          const Icon = locked ? Lock : nodeIcon(f, st);
          const cx = 50 + Math.sin(i * 0.9) * (AMP / 5.6); // % по горизонтали
          const top = renderIdx * NODE_GAP + 30;
          const meta = STATE_META[st];
          const isStart = !locked && st !== "solid" && i === firstUnlockedWeak(floors);

          return (
            <div
              key={f.id}
              className="absolute -translate-x-1/2"
              style={{ left: `${cx}%`, top }}
            >
              {/* подпись темы */}
              <div className="mb-1.5 text-center">
                <div className="text-[12px] font-semibold text-hi">{f.name}</div>
                {locked ? (
                  <div className="font-mono text-[9px] text-lo">+{unlockGap(floors, i)}% до открытия</div>
                ) : (
                  <div className="font-mono text-[9px]" style={{ color: meta.color }}>
                    {meta.label.split(" ")[0]}
                  </div>
                )}
              </div>

              {/* узел */}
              <motion.button
                onClick={() => tap(f, i)}
                whileHover={!locked ? { scale: 1.06, y: -2 } : { rotate: [0, -4, 4, 0] }}
                whileTap={!locked ? { scale: 0.94 } : undefined}
                className="relative mx-auto grid h-[66px] w-[66px] place-items-center rounded-full"
                style={{
                  background: locked
                    ? "rgb(var(--glass-hi) / 0.06)"
                    : f.boss
                    ? `radial-gradient(circle at 35% 30%, ${f.hue}, ${f.hue}cc)`
                    : st === "solid"
                    ? "rgb(91 227 176 / 0.9)"
                    : `rgb(var(--accent))`,
                  border: locked
                    ? "2px solid rgb(var(--line) / 0.4)"
                    : `3px solid ${f.boss ? f.hue : "rgb(var(--glass-hi) / 0.5)"}`,
                  boxShadow: locked
                    ? "none"
                    : `0 8px 0 -1px ${f.boss ? f.hue + "88" : "rgb(var(--accent) / 0.5)"}, 0 12px 26px -8px rgb(var(--accent)/0.5)`,
                  color: locked ? "rgb(var(--lo))" : "rgb(var(--bg-0))",
                }}
              >
                <Icon size={f.boss ? 28 : 24} />
                {/* пульс «начни отсюда» */}
                {isStart && (
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{ border: "3px solid rgb(var(--accent))" }}
                    animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                )}
              </motion.button>

              {/* «НАЧАТЬ» бабл у активного узла (как Duolingo) */}
              {isStart && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto mt-2 w-fit rounded-lg border border-accent/50 bg-bg-0/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-accent backdrop-blur-md"
                >
                  Начать
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* быстрая тренировка слабейшей доступной темы */}
      <div className="mx-auto mb-8 mt-2 flex max-w-[560px] justify-center px-4">
        <button
          onClick={() => {
            const wi = firstUnlockedWeak(floors);
            if (wi >= 0) openModal("lesson", floors[wi].id);
          }}
          className="flex items-center gap-2 rounded-2xl border border-line bg-[rgb(var(--glass-hi)/0.04)] px-5 py-3 text-[13px] text-hi transition-colors hover:bg-[rgb(var(--glass-hi)/0.08)]"
        >
          <Dumbbell size={15} className="text-accent" /> Продолжить с подсказки наставника
        </button>
      </div>
    </div>
  );
}

/** Индекс первой незаблокированной не-монолитной темы (куда «идти дальше»). */
function firstUnlockedWeak(floors: Floor[]): number {
  let best = -1;
  let bestR = Infinity;
  floors.forEach((f, i) => {
    if (isLocked(floors, i)) return;
    if (floorState(f) === "solid") return;
    const r = floorReadiness(f);
    if (r < bestR) {
      bestR = r;
      best = i;
    }
  });
  return best;
}

/**
 * Path-строка змейки в координатах viewBox "0 0 100 H": x — 0..100 (как %, но
 * без юнита, т.к. SVG-path не принимает %), y — те же px, что и высота viewBox.
 */
function pathLine(n: number): string {
  let d = "";
  for (let renderIdx = 0; renderIdx < n; renderIdx++) {
    const i = n - 1 - renderIdx;
    const cx = 50 + Math.sin(i * 0.9) * (AMP / 5.6);
    const y = renderIdx * NODE_GAP + 63;
    d += `${renderIdx === 0 ? "M" : "L"} ${cx.toFixed(2)} ${y} `;
  }
  return d;
}
