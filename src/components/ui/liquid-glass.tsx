"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Движущийся блик по поверхности стекла. */
  sheen?: boolean;
  /** Лёгкий 3D-наклон вслед за курсором (parallax). */
  interactive?: boolean;
  /** Мягкое всплывание. */
  float?: boolean;
  as?: "div" | "aside" | "section" | "article";
}

/**
 * LIQUID GLASS — фирменная стеклянная HUD-панель.
 *
 * Куда «в тему»: панели командного центра, парящие поверх голографического
 * Шпиля — консоль готовности, инспектор этажа и карточки ФИПИ-разбора.
 * Стекло преломляет свечение Шпиля под цвет предмета (тёплый/холодный),
 * имеет спекулярный блик-«линзу» и реагирует наклоном на курсор —
 * усиливая ощущение физического стекла в sci-fi-интерфейсе.
 */
export function LiquidGlass({
  className,
  children,
  sheen = false,
  interactive = false,
  float = false,
  as = "div",
  ...rest
}: LiquidGlassProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [4, -4]), {
    stiffness: 150,
    damping: 18,
  });
  const ry = useSpring(useTransform(mx, [0, 1], [-4, 4]), {
    stiffness: 150,
    damping: 18,
  });
  // блик-линза смещается вслед за курсором
  const glareX = useTransform(mx, [0, 1], ["8%", "92%"]);
  const glareY = useTransform(my, [0, 1], ["0%", "60%"]);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  }
  function onLeave() {
    if (!interactive) return;
    mx.set(0.5);
    my.set(0.5);
  }

  const MotionTag = motion[as] as React.ComponentType<
    React.ComponentProps<typeof motion.div>
  >;

  return (
    <MotionTag
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={
        interactive
          ? { rotateX: rx, rotateY: ry, transformPerspective: 900 }
          : undefined
      }
      className={cn(
        "liquid-glass rounded-2xl",
        float && "animate-glass-float",
        className
      )}
      {...(rest as React.ComponentProps<typeof motion.div>)}
    >
      {sheen && <span className="liquid-glass-sheen" aria-hidden="true" />}
      {interactive && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-[1] rounded-2xl"
          style={{
            background: `radial-gradient(120px 90px at ${glareX} ${glareY}, rgba(255,255,255,.18), transparent 60%)`,
          }}
        />
      )}
      {children}
    </MotionTag>
  );
}
