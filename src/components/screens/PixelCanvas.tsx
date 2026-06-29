"use client";

import * as React from "react";

/**
 * Пиксельный canvas-фон (staggered outward ripple + shimmer).
 * Порт из лендинг-прототипа PixelHero. 4× приглушённых цвета + 1× фирменный.
 */
export function PixelCanvas() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = matchMedia("(max-width:780px)").matches;
    // слабое устройство / экономия трафика → не гоняем per-pixel rAF (батарея/жар)
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    const lowPower =
      (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
      (navigator.hardwareConcurrency || 8) <= 4 ||
      nav.connection?.saveData === true;
    // на тач крупнее шаг сетки → кратно меньше пикселей/кадр
    const GAP = isMobile ? 14 : 6;
    const SPEED = 30;
    // staticOnly: рисуем один кадр и не запускаем анимационный цикл
    const staticOnly = reduced || lowPower;
    const COLORS = ["#5C6B89", "#5C6B89", "#5C6B89", "#5C6B89", "#F2B344"];

    type P = {
      x: number;
      y: number;
      color: string;
      speed: number;
      size: number;
      sizeStep: number;
      minSize: number;
      maxSizeInt: number;
      maxSize: number;
      delay: number;
      counter: number;
      counterStep: number;
      isReverse: boolean;
      isShimmer: boolean;
    };
    let pixels: P[] = [];
    let raf = 0;
    let last = performance.now();
    const rand = (a: number, b: number) => Math.random() * (b - a) + a;

    function makePixel(W: number, H: number, x: number, y: number, color: string, base: number, delay: number): P {
      return {
        x,
        y,
        color,
        speed: rand(0.08, 0.4) * base,
        size: 0,
        sizeStep: rand(0.12, 0.28),
        minSize: 0.5,
        maxSizeInt: 2,
        maxSize: rand(0.5, 2),
        delay,
        counter: 0,
        counterStep: rand(1.8, 3.2) + (W + H) * 0.008,
        isReverse: false,
        isShimmer: false,
      };
    }
    function draw(p: P) {
      const offset = p.maxSizeInt * 0.5 - p.size * 0.5;
      ctx!.fillStyle = p.color;
      ctx!.fillRect(p.x + offset, p.y + offset, p.size, p.size);
    }
    function shimmer(p: P) {
      if (p.size >= p.maxSize) p.isReverse = true;
      else if (p.size <= p.minSize) p.isReverse = false;
      p.size += p.isReverse ? -p.speed : p.speed;
    }
    function appear(p: P) {
      if (p.counter <= p.delay) {
        p.counter += p.counterStep;
        return;
      }
      if (p.size >= p.maxSize) p.isShimmer = true;
      if (p.isShimmer) shimmer(p);
      else p.size += p.sizeStep;
      draw(p);
    }
    function build() {
      const r = wrap!.getBoundingClientRect();
      const W = Math.max(1, Math.floor(r.width));
      const H = Math.max(1, Math.floor(r.height));
      canvas!.width = W;
      canvas!.height = H;
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      const eff = staticOnly ? 0 : Math.min(SPEED, 100) * 0.001;
      pixels = [];
      for (let x = 0; x < W; x += GAP) {
        for (let y = 0; y < H; y += GAP) {
          const color = COLORS[(Math.random() * COLORS.length) | 0];
          const dx = x - W / 2,
            dy = y - H / 2;
          const delay = staticOnly ? 0 : Math.sqrt(dx * dx + dy * dy) * 0.65;
          pixels.push(makePixel(W, H, x, y, color, eff, delay));
        }
      }
    }
    function staticDraw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of pixels) {
        p.size = p.maxSize;
        draw(p);
      }
    }
    const interval = 1000 / 60;
    function loop() {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const el = now - last;
      if (el < interval) return;
      last = now - (el % interval);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (let i = 0; i < pixels.length; i++) appear(pixels[i]);
    }
    function start() {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      cancelAnimationFrame(raf);
    }

    build();
    if (staticOnly) staticDraw();
    else start();

    let rt: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        build();
        if (staticOnly) staticDraw();
      }, 120);
    });
    ro.observe(wrap);

    const onVis = () => {
      if (document.hidden) stop();
      else if (!staticOnly) start();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
