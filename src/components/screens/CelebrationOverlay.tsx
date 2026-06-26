"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, Flame, Target, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { playCelebrate } from "@/lib/sound";
import { prefersReducedMotion } from "@/lib/device-tier";

const ICONS = {
  "floor-solid": Sparkles,
  "level-up": Trophy,
  goal: Target,
  streak: Flame,
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
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);

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
    const N = window.innerWidth < 780 ? 90 : 170;
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
  const celebration = useApp((s) => s.celebrationQueue[0] ?? null);
  const dismiss = useApp((s) => s.dismissCelebration);

  // ключ для перезапуска эффекта при смене конкретного празднования в очереди
  const key = celebration ? celebration.kind + celebration.title : null;

  React.useEffect(() => {
    if (!celebration) return;
    playCelebrate();
    const t = setTimeout(dismiss, 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, dismiss]);

  const Icon = celebration ? ICONS[celebration.kind] : Sparkles;

  return (
    <AnimatePresence mode="wait">
      {celebration && (
        <motion.div
          key={key ?? "celebration"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgb(var(--scrim) / 0.55)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
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
              width: "min(92vw, 380px)",
              borderRadius: 24,
              border: "1px solid rgb(var(--glass-hi) / var(--glass-border-a))",
              padding: "30px 26px 26px",
              textAlign: "center",
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
              style={{
                margin: "0 auto 16px",
                width: 76,
                height: 76,
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                background: "rgb(var(--accent) / 0.16)",
                border: "2px solid rgb(var(--accent) / 0.5)",
                boxShadow: "0 0 40px -6px rgb(var(--accent) / 0.6)",
              }}
            >
              <Icon size={38} style={{ color: "rgb(var(--accent))" }} />
            </motion.div>
            <h2
              style={{
                margin: "0 0 8px",
                fontFamily: "var(--serif)",
                fontSize: "1.5rem",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                color: "rgb(var(--hi))",
              }}
            >
              {celebration.title}
            </h2>
            <p
              className="font-hand"
              style={{
                margin: 0,
                fontSize: 18,
                lineHeight: 1.35,
                color: "rgb(var(--mid))",
              }}
            >
              {celebration.subtitle}
            </p>
            <div
              style={{
                marginTop: 16,
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgb(var(--lo))",
              }}
            >
              нажми, чтобы продолжить
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
