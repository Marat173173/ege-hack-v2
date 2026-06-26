"use client";

import * as React from "react";
import { motion, useSpring, useTransform } from "framer-motion";

/**
 * XP-кольцо в духе Apple Fitness: круговой прогресс дневной цели с
 * пружинной анимацией заполнения. В центре — уровень.
 */
export function XpRing({
  ratio,
  level,
  size = 38,
  stroke = 4,
}: {
  ratio: number; // 0..1 заполнение
  level: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));

  // пружинное заполнение
  const spring = useSpring(clamped, { stiffness: 120, damping: 20 });
  React.useEffect(() => {
    spring.set(clamped);
  }, [clamped, spring]);
  const dashoffset = useTransform(spring, (v) => circ * (1 - v));

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--glass-hi) / 0.12)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          style={{ strokeDashoffset: dashoffset, filter: "drop-shadow(0 0 4px rgb(var(--accent) / 0.6))" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--mono)",
          fontSize: size > 34 ? 13 : 11,
          fontWeight: 800,
          color: "rgb(var(--hi))",
        }}
      >
        {level}
      </div>
    </div>
  );
}
