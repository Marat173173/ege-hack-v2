"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle — переключатель Светлая/Тёмная в стиле AnimatedLayerButton:
 * та же «выдавленная» жёсткая тень + мягкое свечение через --theme-glow
 * (инвертируется по теме). Иконка солнце/луна меняется с анимацией.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useApp((s) => s.theme);
  const toggleTheme = useApp((s) => s.toggleTheme);
  // иконка зависит от темы (которая на клиенте может отличаться от SSR),
  // поэтому до маунта не рендерим её — иначе hydration mismatch (<circle> в <svg>)
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      className={cn(
        "group relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border-none bg-accent",
        "cursor-pointer transition-all duration-300 ease-in-out",
        "[box-shadow:4px_4px_0px_rgb(var(--theme-glow)/0.85),0_0_20px_-6px_rgb(var(--theme-glow)/0.5)]",
        "hover:translate-y-[3px] hover:[box-shadow:2px_2px_0px_rgb(var(--theme-glow)/0.85),0_0_12px_-4px_rgb(var(--theme-glow)/0.45)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {mounted && (
          <motion.span
            key={theme}
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25 }}
            className="grid place-items-center text-[#0a0e18]"
          >
            {isDark ? <Moon size={18} /> : <Sun size={19} />}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
