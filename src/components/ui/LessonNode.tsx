"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";

/** Состояния узла Тропы — совпадают с FloorState (@/lib/floor-state). */
export type NodeState = "ghost" | "forming" | "unstable" | "solid";

export interface LessonNodeProps {
  /** Иконка в центре диска (Lucide). При locked принудительно рисуется Lock. */
  icon: LucideIcon;
  /** Состояние темы. */
  state: NodeState;
  /** Закрыт гейтингом — визуально перебивает state (стекло + замок). */
  locked?: boolean;
  /** Босс-узел (финал раздела): корона крупнее, обводка под hue, без кольца. */
  boss?: boolean;
  /** Итоговый HEX оттенка секции/этажа (#RRGGBB) — «лицо» для forming/ghost/boss. */
  hue: string;
  /** 0..100 — заполнение кольца прогресса (обычно f.prog). */
  progress?: number;
  /** Пульс «ты здесь» + чип над узлом. */
  isCurrent?: boolean;
  /** Название темы (идёт в aria-label и в подпись). */
  label: string;
  /** Код ФИПИ для моно-подписи под узлом, напр. "2.4". */
  code?: string;
  /** Человекочитаемое состояние («Формируется»…) — для aria и подписи. */
  stateLabel?: string;
  /** Цвет подписи состояния (STATE_META[st].color). */
  stateColor?: string;
  /** Диаметр диска, px (по умолчанию 58 — как в старой Тропе). */
  size?: number;
  /** Слот в правом-верхнем углу диска (напр. кнопка «Спросить репетитора»). */
  topRight?: React.ReactNode;
  onClick?: () => void;
}

/** HEX → "r g b": тройка для alpha-совместимой композиции rgb(var(--face) / a). */
function hexTriple(hex: string): string {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/**
 * LESSON NODE — круглый узел-«урок» Тропы (Duolingo-стиль) на токенах ЕГЭ-ХАК.
 *
 * • Цвет-«лицо» задаётся ОДНОЙ переменной --face (тройка RGB), поэтому заливка,
 *   «клеевая» тень (claymorphism) и кольцо берут alpha через rgb(var(--face)/a) —
 *   без хака hex+"88" из старого PathScreen.
 * • solid → --node-solid (мята), unstable → --node-danger (красный),
 *   forming/ghost/boss → оттенок секции (hue). locked → --glass-* (обе темы).
 * • Пульс «ты здесь», hover-подъём и анимация кольца глушатся при
 *   prefers-reduced-motion (framer-motion useReducedMotion, а не только CSS).
 * • A11y: <button> с aria-label (тема + состояние + «закрыто»), focus-visible-кольцо.
 */
export function LessonNode({
  icon: Icon,
  state,
  locked = false,
  boss = false,
  hue,
  progress = 0,
  isCurrent = false,
  label,
  code,
  stateLabel,
  stateColor,
  size = 58,
  topRight,
  onClick,
}: LessonNodeProps) {
  const reduce = useReducedMotion();

  // «лицо» узла → выражение, дающее тройку RGB (токен или конвертированный hue)
  const faceVar = locked
    ? null
    : boss
    ? hexTriple(hue)
    : state === "solid"
    ? "var(--node-solid)"
    : state === "unstable"
    ? "var(--node-danger)"
    : hexTriple(hue); // forming / ghost → оттенок секции

  const ringBox = size + 10;
  const R = (ringBox - 6) / 2;
  const C = 2 * Math.PI * R;
  const pct = state === "solid" ? 100 : Math.max(0, Math.min(100, progress));
  const showRing = !locked && !boss; // кольцо прогресса — только у обычных «уроков»

  const stateWord = stateLabel ? stateLabel.split(" ")[0] : "";
  const ariaLabel =
    `${label}${boss ? ", финал раздела" : ""}` +
    (locked ? ", закрыто" : stateLabel ? ` — ${stateLabel}` : "");

  return (
    <div
      className="relative flex flex-col items-center"
      style={faceVar ? ({ "--face": faceVar } as React.CSSProperties) : undefined}
    >
      {/* «ты здесь» — чип над узлом */}
      {isCurrent && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute -top-[26px] z-10 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide"
          style={{ background: "rgb(var(--face, var(--accent)))", color: "#0a0e18" }}
        >
          ты здесь
        </motion.div>
      )}

      {/* контейнер: кольцо + пульс + диск */}
      <div
        className="relative grid place-items-center"
        style={{ width: ringBox, height: ringBox }}
      >
        {/* пульс-кольцо «ты здесь» (гаснет при reduced-motion) */}
        {isCurrent && !reduce && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full"
            style={{
              width: size,
              height: size,
              border: "2.5px solid rgb(var(--face, var(--accent)))",
            }}
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.7, repeat: Infinity, ease: "easeOut" }}
          />
        )}

        {/* SVG-кольцо прогресса */}
        {showRing && (
          <svg
            className="pointer-events-none absolute -rotate-90"
            width={ringBox}
            height={ringBox}
            aria-hidden="true"
          >
            <circle
              cx={ringBox / 2}
              cy={ringBox / 2}
              r={R}
              fill="none"
              strokeWidth={4}
              stroke="rgb(var(--glass-hi) / 0.14)"
            />
            <circle
              cx={ringBox / 2}
              cy={ringBox / 2}
              r={R}
              fill="none"
              strokeWidth={4}
              strokeLinecap="round"
              stroke="rgb(var(--face))"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct / 100)}
              style={{ transition: reduce ? "none" : "stroke-dashoffset .5s ease" }}
            />
          </svg>
        )}

        <motion.button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          whileHover={locked || reduce ? undefined : { scale: 1.06, y: -2 }}
          whileTap={locked ? { rotate: [0, -4, 4, 0] } : { scale: 0.94, y: 2 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="relative grid place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
          style={{
            width: size,
            height: size,
            color: locked ? "rgb(var(--mid))" : "#0a0e18",
            background: locked
              ? "rgb(var(--glass-tint) / var(--glass-tint-a))"
              : "rgb(var(--face))",
            border: locked
              ? "2px dashed rgb(var(--line) / 0.6)"
              : boss
              ? "2.5px solid rgb(var(--face))"
              : "2.5px solid rgb(var(--glass-hi) / 0.5)",
            boxShadow: locked
              ? "none"
              : "0 6px 0 -1px rgb(var(--face) / 0.5), 0 12px 24px -10px rgb(var(--face) / 0.85)",
          }}
        >
          {locked ? (
            <Lock size={18} strokeWidth={2.4} />
          ) : (
            <Icon size={boss ? 24 : 19} strokeWidth={2.4} />
          )}
        </motion.button>

        {/* слот: кнопка «репетитор» (44px тап-зона, 24px визуал) */}
        {topRight && (
          <div className="absolute right-0 top-0 -translate-y-1/3 translate-x-1/3">
            {topRight}
          </div>
        )}
      </div>

      {/* подпись: кегль поднят до читаемого; мелочь — Iosevka (не pixel-шрифт) */}
      <div className="mt-1.5 max-w-[150px] text-center">
        {code && <div className="font-mono text-[10px] leading-none text-mid">{code}</div>}
        <div
          className="mt-0.5 text-[11px] leading-tight text-hi"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {label}
        </div>
        {!locked && stateWord && (
          <div className="mt-0.5 font-mono text-[10px]" style={{ color: stateColor }}>
            {stateWord}
          </div>
        )}
      </div>
    </div>
  );
}
