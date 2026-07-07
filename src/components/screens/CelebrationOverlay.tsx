"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, Flame, Target, Sparkles, Medal, Flag } from "lucide-react";
import { useApp } from "@/lib/store";
import { playCelebrate } from "@/lib/sound";
import { prefersReducedMotion } from "@/lib/device-tier";

const ICONS = {
  "floor-solid": Sparkles,
  "level-up": Trophy,
  goal: Target,
  streak: Flame,
  record: Medal,
  section: Flag,
} as const;

/** Конфетти на canvas — без библиотек. Запускается на маунте оверлея. */
function Confetti({ accent }: { accent: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // DPR-масштаб: backing store в физических пикселях, рисуем в CSS-координатах —
    // иначе конфетти мылится на retina-телефонах
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    const palette = [accent, "#5BE3B0", "#FFC65B", "#FF5C6E", "#EAF0FC", "#6E8BFF"];
    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rot: number;
      vr: number;
      w: number;
      h: number;
      c: string;
      shape: number;
    };
    // на слабых устройствах меньше частиц (меньше save/restore/rotate за кадр)
    const lowPower =
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4 ||
      (navigator.hardwareConcurrency || 8) <= 4;
    const N = W < 780 ? (lowPower ? 55 : 90) : 170;
    const parts: P[] = Array.from({ length: N }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 220,
      y: H * 0.42 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 14,
      vy: -8 - Math.random() * 12,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 7,
      h: 9 + Math.random() * 9,
      c: palette[(Math.random() * palette.length) | 0],
      shape: Math.random() > 0.5 ? 0 : 1,
    }));

    let raf = 0;
    const start = performance.now();
    const grav = 0.34;
    const loop = () => {
      const t = performance.now() - start;
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of parts) {
        p.vy += grav;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y < H + 40) alive = true;
        const fade = Math.max(0, 1 - t / 2600);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.c;
        if (p.shape === 0) ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        else {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, 7);
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive && t < 2800) raf = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [accent]);

  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, zIndex: 69, pointerEvents: "none" }}
    />
  );
}

export function CelebrationOverlay() {
  const queue = useApp((s) => s.celebrationQueue);
  const dismiss = useApp((s) => s.dismissCelebration);
  const dismissAll = useApp((s) => s.dismissAllCelebrations);

  const many = queue.length > 1; // 2+ вехи разом → сводный оверлей (не лавина)
  const current = queue[0] ?? null;
  // ключ перезапуска эффекта: в сводном режиме — по длине очереди
  const key = many ? `summary-${queue.length}` : current ? current.kind + current.title : null;

  // Escape закрывает ВСЮ очередь (в т.ч. сводную)
  React.useEffect(() => {
    if (!queue.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue.length, dismissAll]);

  // один звук на появление; авто-дисмис (сводный держим дольше — надо прочитать)
  React.useEffect(() => {
    if (!queue.length) return;
    playCelebrate();
    const t = setTimeout(many ? dismissAll : dismiss, many ? 5200 : 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const HeadIcon = many ? Trophy : current ? ICONS[current.kind] : Sparkles;
  // тап по фону закрывает: в сводном — всю очередь, иначе — текущую
  const onBackdrop = many ? dismissAll : dismiss;

  return (
    <AnimatePresence mode="wait">
      {queue.length > 0 && (
        <motion.div
          key={key ?? "celebration"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onBackdrop}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgb(var(--scrim) / 0.62)",
            cursor: "pointer",
          }}
        >
          <Confetti accent="rgb(var(--accent))" />
          <motion.div
            className="liquid-glass"
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            style={{
              position: "relative",
              zIndex: 71,
              width: "min(92vw, 400px)",
              borderRadius: 24,
              border: "1px solid rgb(var(--glass-hi) / var(--glass-border-a))",
              padding: many ? "26px 22px 22px" : "30px 26px 26px",
              textAlign: "center",
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
              style={{
                margin: "0 auto 14px",
                width: 72,
                height: 72,
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                background: "rgb(var(--accent) / 0.16)",
                border: "2px solid rgb(var(--accent) / 0.5)",
                boxShadow: "0 0 40px -6px rgb(var(--accent) / 0.6)",
              }}
            >
              <HeadIcon size={36} style={{ color: "rgb(var(--accent))" }} />
            </motion.div>

            {many ? (
              <>
                <h2 style={headStyle}>Отличная сессия!</h2>
                <p className="font-hand" style={{ ...subStyle, marginBottom: 14 }}>
                  Сразу несколько достижений
                </p>
                {/* СПИСОК вех вместо 6 отдельных оверлеев */}
                <div style={{ display: "grid", gap: 8, textAlign: "left" }}>
                  {queue.slice(0, 5).map((c, i) => {
                    const RowIcon = ICONS[c.kind] ?? Sparkles;
                    return (
                      <div
                        key={c.kind + c.title + i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          borderRadius: 12,
                          background: "rgb(var(--glass-hi) / 0.05)",
                          border: "1px solid rgb(var(--line) / var(--line-a))",
                        }}
                      >
                        <span
                          style={{
                            display: "grid",
                            placeItems: "center",
                            width: 30,
                            height: 30,
                            flex: "0 0 auto",
                            borderRadius: "50%",
                            background: "rgb(var(--accent) / 0.14)",
                          }}
                        >
                          <RowIcon size={16} style={{ color: "rgb(var(--accent))" }} />
                        </span>
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: "rgb(var(--hi))",
                            lineHeight: 1.2,
                          }}
                        >
                          {c.title}
                        </span>
                      </div>
                    );
                  })}
                  {queue.length > 5 && (
                    <div style={{ ...noteStyle, textAlign: "center" }}>
                      и ещё {queue.length - 5}
                    </div>
                  )}
                </div>
                <div style={noteStyle}>нажми — закрыть всё</div>
              </>
            ) : (
              <>
                <h2 style={headStyle}>{current!.title}</h2>
                <p className="font-hand" style={subStyle}>
                  {current!.subtitle}
                </p>
                <div style={noteStyle}>нажми, чтобы продолжить</div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const headStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontFamily: "var(--serif)",
  fontSize: "1.5rem",
  lineHeight: 1.1,
  letterSpacing: "-0.01em",
  color: "rgb(var(--hi))",
};
const subStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.35,
  color: "rgb(var(--mid))",
};
const noteStyle: React.CSSProperties = {
  marginTop: 16,
  fontFamily: "var(--mono)",
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgb(var(--lo))",
};
