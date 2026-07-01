"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Lock, Check, Star, BookOpen, Crown, MessageCircle } from "lucide-react";
import { useApp } from "@/lib/store";
import { floorState, STATE_META } from "@/lib/floor-state";
import { isLocked, unlockGap } from "@/lib/floor-build";
import { useToast } from "./Toast";
import type { Floor } from "@/data/types";

/**
 * «Тропа путешественника» — Duolingo skill tree:
 * 63 подтемы русского (ФИПИ 2026) сгруппированы в 5 разделов кодификатора.
 * Раздел = баннер. Подтема = узел на змейке.
 *
 * Клик по узлу = тренировка этой подтемы (или Inspector для мультипредметов).
 * Прогресс/стабильность каждой подтемы = отдельные (см. Floor.prog/stab).
 */

const NODE_GAP = 96;
const AMP = 92;

/** Разделы кодификатора русского для группировки. */
const SECTIONS: Record<string, { title: string; num: string; hue: string }> = {
  "1": { title: "Текст. Информационно-смысловая переработка", num: "1", hue: "#F2B344" },
  "2": { title: "Функциональная стилистика. Культура речи", num: "2", hue: "#E88350" },
  "3": { title: "Язык и речь. Культура речи", num: "3", hue: "#E86A62" },
  "4": { title: "Общие сведения о языке", num: "4", hue: "#B78CD9" },
  "5": { title: "Речь. Речевое общение", num: "5", hue: "#7CB4E8" },
};

function nodeIcon(f: Floor, st: ReturnType<typeof floorState>) {
  if (f.boss) return Crown;
  if (st === "solid") return Check;
  if (st === "ghost" || st === "forming") return BookOpen;
  return Star;
}

const isFipiCode = (s: string) => /^\d+\.\d+/.test(s);
const sectionOf = (id: string) => id.split(".")[0];

export function PathScreen() {
  const subject = useApp((s) => s.subject());
  const openSolve = useApp((s) => s.openSolve);
  const selectFloor = useApp((s) => s.selectFloor);
  const toast = useToast();

  const floors = subject.floors;

  // Группируем этажи по разделу (для русского). Для других предметов группы не строим.
  const grouped: { section: string; floors: Floor[] }[] = React.useMemo(() => {
    const useFipiSections = floors.every((f) => isFipiCode(f.id));
    if (!useFipiSections) return [{ section: "all", floors }];
    const map = new Map<string, Floor[]>();
    for (const f of floors) {
      const s = sectionOf(f.id);
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(f);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([section, arr]) => ({ section, floors: arr }));
  }, [floors]);

  function tap(f: Floor, i: number) {
    if (isLocked(floors, i)) {
      toast(
        `🔒 «${f.name}» закрыт. Укрепи предыдущие темы ещё на <b>~${unlockGap(floors, i)}%</b>.`
      );
      return;
    }
    // Для листов ФИПИ (у которых есть точка в id) — сразу открываем Solve.
    // Для мультипредметных «крупных» этажей — открываем Inspector.
    if (isFipiCode(f.id)) openSolve(f.id);
    else selectFloor(f.id, { zoom: false });
  }

  return (
    <div className="thin-scroll absolute inset-0 overflow-y-auto pb-[160px] pt-[76px] md:pb-8 md:pt-[92px]">
      {/* заголовок */}
      <div className="mx-auto mb-4 max-w-[560px] px-4">
        <div className="rounded-2xl border border-accent/40 bg-accent/[0.08] px-5 py-4">
          <div className="hud-label text-[9px] text-accent">Тропа · {subject.name}</div>
          <h2 className="m-0 mt-1 font-serif text-xl text-hi">Путь к экзамену</h2>
          <p className="m-0 mt-1 text-[12px] text-mid">
            {floors.length > 20
              ? `${floors.length} тем по кодификатору ФИПИ 2026 · клик по узлу = тренировка`
              : "Идём снизу вверх: каждая укреплённая тема открывает следующую."}
          </p>
        </div>
      </div>

      {/* Секции */}
      {grouped.map(({ section, floors: sectionFloors }) => {
        const meta = SECTIONS[section];
        return (
          <div key={section} className="mb-6 px-4">
            {meta && (
              <div className="mx-auto mb-3 max-w-[560px]">
                <div
                  className="rounded-xl border p-3"
                  style={{
                    borderColor: meta.hue + "55",
                    background: `linear-gradient(135deg, ${meta.hue}22, ${meta.hue}05)`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold"
                      style={{ background: meta.hue, color: "rgb(var(--bg-0))" }}
                    >
                      {meta.num}
                    </span>
                    <span className="text-[13px] font-semibold text-hi">{meta.title}</span>
                    <span className="ml-auto font-mono text-[10px] text-lo">
                      {sectionFloors.length} тем
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Змейка узлов */}
            <div
              className="relative mx-auto w-full max-w-[560px]"
              style={{ height: sectionFloors.length * NODE_GAP + 40 }}
            >
              <svg
                className="pointer-events-none absolute left-0 top-0 h-full w-full"
                viewBox={`0 0 100 ${sectionFloors.length * NODE_GAP + 40}`}
                preserveAspectRatio="none"
              >
                <path
                  d={pathLine(sectionFloors.length)}
                  fill="none"
                  stroke={meta?.hue ?? "rgb(var(--accent))"}
                  strokeWidth="1.2"
                  strokeDasharray="2 5"
                  strokeOpacity="0.32"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {sectionFloors.map((f, si) => {
                const i = floors.indexOf(f);
                const st = floorState(f);
                const locked = isLocked(floors, i);
                const Icon = locked ? Lock : nodeIcon(f, st);
                const cx = 50 + Math.sin(si * 0.9) * (AMP / 5.2);
                const top = si * NODE_GAP + 8;
                const stateMeta = STATE_META[st];

                return (
                  <div
                    key={f.id}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${cx}%`, top }}
                  >
                    <motion.button
                      onClick={() => tap(f, i)}
                      whileHover={!locked ? { scale: 1.06, y: -2 } : { rotate: [0, -4, 4, 0] }}
                      whileTap={!locked ? { scale: 0.94 } : undefined}
                      className="relative mx-auto grid h-[58px] w-[58px] place-items-center rounded-full"
                      style={{
                        background: locked
                          ? "rgb(var(--glass-hi) / 0.06)"
                          : f.boss
                          ? `radial-gradient(circle at 35% 30%, ${meta?.hue ?? "rgb(var(--accent))"}, ${meta?.hue ?? "#FFB000"}cc)`
                          : st === "solid"
                          ? "rgb(91 227 176 / 0.9)"
                          : `${meta?.hue ?? "rgb(var(--accent))"}`,
                        border: locked
                          ? "2px solid rgb(var(--line) / 0.4)"
                          : `2.5px solid ${f.boss ? (meta?.hue ?? "#FFB000") : "rgb(var(--glass-hi) / 0.5)"}`,
                        boxShadow: locked
                          ? "none"
                          : `0 6px 0 -1px ${f.boss ? (meta?.hue ?? "#FFB000") + "88" : (meta?.hue ?? "rgb(var(--accent))") + "88"}`,
                        color: locked ? "rgb(var(--lo))" : "rgb(var(--bg-0))",
                      }}
                    >
                      <Icon size={f.boss ? 22 : 18} />
                    </motion.button>

                    {/* Подпись */}
                    <div className="mt-1 max-w-[160px] text-center">
                      <div className="font-mono text-[9px] text-lo">{f.id}</div>
                      <div
                        className="mt-0.5 text-[10.5px] leading-tight text-mid"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        {f.name}
                      </div>
                      {!locked && (
                        <div className="mt-0.5 font-mono text-[8.5px]" style={{ color: stateMeta.color }}>
                          {stateMeta.label.split(" ")[0]}
                        </div>
                      )}
                    </div>

                    {/* Кнопка «Спросить репетитора» */}
                    {!locked && isFipiCode(f.id) && (
                      <a
                        href={`/tutor?topic=${encodeURIComponent(f.id)}&subject=russian`}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -right-4 -top-1 grid h-6 w-6 place-items-center rounded-full border border-line bg-bg-0 text-mid transition-colors hover:text-accent"
                        title="Спросить репетитора"
                      >
                        <MessageCircle size={11} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function pathLine(n: number): string {
  let d = "";
  for (let i = 0; i < n; i++) {
    const cx = 50 + Math.sin(i * 0.9) * (AMP / 5.2);
    const y = i * NODE_GAP + 37;
    d += `${i === 0 ? "M" : "L"} ${cx.toFixed(2)} ${y} `;
  }
  return d;
}
