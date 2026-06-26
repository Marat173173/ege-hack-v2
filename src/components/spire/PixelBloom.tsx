"use client";

import * as React from "react";

export interface BloomTrigger {
  ox: number | null;
  oy: number | null;
  hue: string;
  nonce: number;
}

/**
 * Пиксельный bloom-переход при «приближении» к теме — одноразовый ripple
 * из точки касания в цвете темы. Порт из прототипа. Тяжёлый эффект —
 * не играет при reduce-motion / лёгком режиме.
 */
export function PixelBloom({
  trigger,
  disabled,
}: {
  trigger: BloomTrigger | null;
  disabled: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!trigger || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia("(max-width: 780px)").matches || /Mobi|Android/i.test(navigator.userAgent));

    const W = (canvas.width = Math.floor(window.innerWidth));
    const H = (canvas.height = Math.floor(window.innerHeight));
    const cx = trigger.ox == null ? W * 0.5 : trigger.ox;
    const cy = trigger.oy == null ? H * 0.44 : trigger.oy;
    const gap = isMobile ? 18 : 13;

    type P = { x: number; y: number; delay: number; max: number; jit: number };
    const pixels: P[] = [];
    for (let x = 0; x < W; x += gap) {
      for (let y = 0; y < H; y += gap) {
        const d = Math.hypot(x - cx, y - cy);
        pixels.push({ x, y, delay: d * 0.55, max: gap * 0.92, jit: Math.random() * 40 });
      }
    }

    const start = performance.now();
    let raf = 0;
    const grow = 150,
      hold = 70,
      shrink = 240;

    const loop = () => {
      const e = performance.now() - start;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = trigger.hue || "#F2B344";
      let alive = false;
      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        const local = e - p.delay - p.jit;
        if (local < 0) {
          alive = true;
          continue;
        }
        let size = 0,
          a = 0;
        if (local < grow) {
          size = p.max * (local / grow);
          a = local / grow;
          alive = true;
        } else if (local < grow + hold) {
          size = p.max;
          a = 1;
          alive = true;
        } else if (local < grow + hold + shrink) {
          const k = (local - grow - hold) / shrink;
          size = p.max * (1 - k);
          a = 1 - k;
          alive = true;
        } else continue;
        if (size <= 0) continue;
        ctx.globalAlpha = a * 0.9;
        const o = (p.max - size) * 0.5;
        ctx.fillRect(p.x + o, p.y + o, size, size);
      }
      ctx.globalAlpha = 1;
      if (alive) raf = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [trigger, disabled]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none" }}
    />
  );
}
