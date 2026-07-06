"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Lock, Check, Star, BookOpen, Crown, MessageCircle, Sparkles, ChevronDown } from "lucide-react";
import { useApp } from "@/lib/store";
import { floorState, STATE_META } from "@/lib/floor-state";
import { isLocked, unlockGap, floorReadiness, visibleFloors } from "@/lib/floor-build";
import { useToast } from "./Toast";
import type { Floor } from "@/data/types";

/**
 * «Тропа путешественника» — Duolingo skill tree.
 *
 * Гейтинг видимости: показываем ВСЕ открытые темы + 3 закрытых «превью».
 * Остальное скрыто и проявляется по мере укрепления — карта не превращается
 * в бесконечный список из 63 узлов (см. visibleFloors()).
 *
 * Раздел кодификатора = баннер с прогрессом. Подтема = узел на змейке.
 * Текущая (самая слабая открытая) тема подсвечена пульсом «ты здесь».
 */

const NODE_GAP = 104;
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

  // ——— видимый набор: открытые + 3 закрытых превью ———
  const visible = React.useMemo(() => visibleFloors(floors), [floors]);
  const hiddenCount = floors.length - visible.length;

  const useFipiSections = React.useMemo(() => floors.every((f) => isFipiCode(f.id)), [floors]);

  // «текущая» тема — самая слабая ОТКРЫТАЯ (не монолит): на ней пульс «ты здесь»
  const currentId = React.useMemo(() => {
    let id: string | null = null;
    let min = Infinity;
    visible.forEach((f) => {
      const i = floors.indexOf(f);
      if (isLocked(floors, i) || floorState(f) === "solid") return;
      const r = floorReadiness(f);
      if (r < min) {
        min = r;
        id = f.id;
      }
    });
    return id;
  }, [visible, floors]);

  // прогресс по разделам считаем по ПОЛНОМУ кодификатору (честные счётчики)
  const sectionStats = React.useMemo(() => {
    const m = new Map<string, { total: number; solid: number; open: number }>();
    floors.forEach((f, i) => {
      const s = sectionOf(f.id);
      const cur = m.get(s) ?? { total: 0, solid: 0, open: 0 };
      cur.total++;
      if (floorState(f) === "solid") cur.solid++;
      if (!isLocked(floors, i)) cur.open++;
      m.set(s, cur);
    });
    return m;
  }, [floors]);

  // группируем ВИДИМЫЕ этажи по разделу (для русского)
  const grouped: { section: string; floors: Floor[] }[] = React.useMemo(() => {
    if (!useFipiSections) return [{ section: "all", floors: visible }];
    const map = new Map<string, Floor[]>();
    for (const f of visible) {
      const s = sectionOf(f.id);
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(f);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([section, arr]) => ({ section, floors: arr }));
  }, [visible, useFipiSections]);

  function tap(f: Floor, i: number) {
    if (isLocked(floors, i)) {
      toast(
        `🔒 «${f.name}» закрыт. Укрепи предыдущие темы ещё на <b>~${unlockGap(floors, i)}%</b>.`
      );
      return;
    }
    if (isFipiCode(f.id)) openSolve(f.id);
    else selectFloor(f.id, { zoom: false });
  }

  const openTotal = React.useMemo(
    () => floors.filter((_, i) => !isLocked(floors, i)).length,
    [floors]
  );

  return (
    <div className="thin-scroll pb-nav absolute inset-0 overflow-y-auto pt-[76px] md:pt-[92px]">
      {/* заголовок */}
      <div className="mx-auto mb-5 max-w-[560px] px-4">
        <div className="relative overflow-hidden rounded-2xl border border-accent/40 bg-accent/[0.08] px-5 py-4">
          <div className="hud-label text-[9px] text-accent">Тропа · {subject.name}</div>
          <h2 className="m-0 mt-1 font-serif text-xl text-hi">Путь к экзамену</h2>
          <p className="m-0 mt-1 text-[12px] leading-snug text-mid">
            {useFipiSections
              ? "Идём снизу вверх: укрепляй открытые темы — следующие открываются сами."
              : "Идём снизу вверх: каждая укреплённая тема открывает следующую."}
          </p>
          {/* общий прогресс открытия */}
          <div className="mt-3 flex items-center gap-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgb(var(--hi)/0.08)]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent"
                initial={false}
                animate={{ width: `${Math.round((openTotal / Math.max(1, floors.length)) * 100)}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 22 }}
              />
            </div>
            <span className="shrink-0 font-mono text-[10px] text-lo">
              {openTotal}/{floors.length} открыто
            </span>
          </div>
        </div>
      </div>

      {/* Секции */}
      {grouped.map(({ section, floors: sectionFloors }) => {
        const meta = SECTIONS[section];
        const stat = sectionStats.get(section);
        const pct = stat ? Math.round((stat.solid / Math.max(1, stat.total)) * 100) : 0;
        return (
          <div key={section} className="mb-2 px-4">
            {meta && (
              <div className="mx-auto mb-4 max-w-[560px]">
                <div
                  className="rounded-2xl border p-3.5"
                  style={{
                    borderColor: meta.hue + "55",
                    background: `linear-gradient(135deg, ${meta.hue}22, ${meta.hue}08)`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-xl font-mono text-[12px] font-bold shadow-[0_4px_0_-1px_rgba(0,0,0,0.25)]"
                      style={{ background: meta.hue, color: "#0a0e18" }}
                    >
                      {meta.num}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] font-semibold leading-tight text-hi">
                      {meta.title}
                    </span>
                    {stat && (
                      <span className="shrink-0 font-mono text-[10.5px] text-lo">
                        {stat.solid}/{stat.total}
                      </span>
                    )}
                  </div>
                  {stat && (
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[rgb(var(--hi)/0.08)]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: meta.hue }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Змейка узлов */}
            <div
              className="relative mx-auto w-full max-w-[560px]"
              style={{ height: sectionFloors.length * NODE_GAP + 48 }}
            >
              <svg
                className="pointer-events-none absolute left-0 top-0 h-full w-full"
                viewBox={`0 0 100 ${sectionFloors.length * NODE_GAP + 48}`}
                preserveAspectRatio="none"
              >
                <path
                  d={pathLine(sectionFloors.length)}
                  fill="none"
                  stroke={meta?.hue ?? "rgb(var(--accent))"}
                  strokeWidth="1.4"
                  strokeDasharray="1 6"
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {sectionFloors.map((f, si) => {
                const i = floors.indexOf(f);
                const st = floorState(f);
                const locked = isLocked(floors, i);
                const isCurrent = f.id === currentId;
                const Icon = locked ? Lock : nodeIcon(f, st);
                const cx = 50 + Math.sin(si * 0.9) * (AMP / 5.2);
                const top = si * NODE_GAP + 8;
                const stateMeta = STATE_META[st];
                // ВАЖНО: фолбэк — HEX-hue этажа (f.hue), а не "rgb(var(--accent))":
                // ниже цвет конкатенируется с alpha (`${faceColor}88`), а к rgb(var())
                // такой суффикс невалиден и роняет всю box-shadow.
                const nodeHue = meta?.hue ?? f.hue;
                const faceColor = f.boss
                  ? nodeHue
                  : st === "solid"
                  ? "#5BE3B0"
                  : nodeHue;

                return (
                  <div
                    key={f.id}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${cx}%`, top }}
                  >
                    {/* «ты здесь» — чип над текущей темой */}
                    {isCurrent && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-wide"
                        style={{ background: nodeHue, color: "#0a0e18" }}
                      >
                        ты здесь
                      </motion.div>
                    )}

                    {/* пульс-кольцо у текущей темы */}
                    {isCurrent && (
                      <motion.span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-full"
                        style={{ width: 58, height: 58, border: `2.5px solid ${nodeHue}` }}
                        animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
                        transition={{ duration: 1.7, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}

                    <motion.button
                      onClick={() => tap(f, i)}
                      whileHover={!locked ? { scale: 1.06, y: -2 } : { rotate: [0, -4, 4, 0] }}
                      whileTap={!locked ? { scale: 0.94 } : undefined}
                      className="relative mx-auto grid h-[58px] w-[58px] place-items-center rounded-full"
                      style={{
                        background: locked ? "rgb(var(--glass-hi) / 0.05)" : faceColor,
                        border: locked
                          ? "2px dashed rgb(var(--line) / 0.55)"
                          : `2.5px solid ${f.boss ? nodeHue : "rgb(var(--glass-hi) / 0.55)"}`,
                        boxShadow: locked
                          ? "none"
                          : `0 6px 0 -1px ${faceColor}88, 0 10px 22px -10px ${faceColor}`,
                        color: locked ? "rgb(var(--lo))" : "#0a0e18",
                        opacity: locked ? 0.6 : 1,
                      }}
                    >
                      <Icon size={f.boss ? 24 : 19} strokeWidth={2.4} />
                    </motion.button>

                    {/* Подпись */}
                    <div className="mx-auto mt-1.5 max-w-[150px] text-center">
                      <div className="font-mono text-[9px] text-lo">{f.id}</div>
                      <div
                        className="mt-0.5 text-[10.5px] leading-tight text-mid"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {f.name}
                      </div>
                      {!locked && (
                        <div
                          className="mt-0.5 font-mono text-[8.5px]"
                          style={{ color: stateMeta.color }}
                        >
                          {stateMeta.label.split(" ")[0]}
                        </div>
                      )}
                    </div>

                    {/* Кнопка «Спросить репетитора» */}
                    {!locked && isFipiCode(f.id) && (
                      <a
                        href={`/tutor?topic=${encodeURIComponent(f.id)}&subject=russian`}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -right-3 -top-1 grid h-6 w-6 place-items-center rounded-full border border-line bg-bg-0 text-mid transition-colors hover:text-accent"
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

      {/* Футер: остальное скрыто и откроется по мере готовности */}
      {hiddenCount > 0 && (
        <div className="mx-auto max-w-[560px] px-4">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-line border-dashed bg-[rgb(var(--hi)/0.02)] px-5 py-6 text-center">
            <ChevronDown size={18} className="text-lo" />
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-hi">
              <Lock size={13} className="text-lo" /> Ещё {hiddenCount} тем
            </div>
            <p className="m-0 max-w-[320px] text-[12px] leading-snug text-mid">
              Укрепляй открытые темы — новые ступени Тропы будут открываться сами,
              по 3 вперёд. Так карта экзамена не давит объёмом.
            </p>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-accent">
              <Sparkles size={11} /> собери верхние до монолита
            </div>
          </div>
        </div>
      )}
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
