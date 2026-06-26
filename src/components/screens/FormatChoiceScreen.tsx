"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Building2, Footprints, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import type { ViewMode } from "@/lib/profile";

/**
 * Экран первого входа: выбор формата визуализации прогресса.
 * Шпиль (вертикальная 3D-башня) или Тропа путешественника (2D-змейка узлов).
 * Это одни и те же данные/гейтинг — только разный вид.
 */
export function FormatChoiceScreen() {
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const setScreen = useApp((s) => s.setScreen);
  const [picked, setPicked] = React.useState<ViewMode>(profile.viewMode);

  function confirm() {
    updateProfile({ viewMode: picked, viewChosen: true });
    setScreen("spire"); // SpireScreen внутри сам отрисует нужный вид
  }

  const options: {
    key: ViewMode;
    title: string;
    sub: string;
    icon: typeof Building2;
    preview: React.ReactNode;
  }[] = [
    {
      key: "spire",
      title: "Шпиль",
      sub: "Вертикальная архитектура. Строишь башню знаний снизу вверх — высота = готовность.",
      icon: Building2,
      preview: <SpirePreview />,
    },
    {
      key: "path",
      title: "Тропа путешественника",
      sub: "Идёшь по тропе от темы к теме, как по карте приключения. Узлы открываются один за другим.",
      icon: Footprints,
      preview: <PathPreview />,
    },
  ];

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-bg-0 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] md:py-10">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgb(var(--accent) / 0.10), transparent 70%)",
        }}
      />

      <div className="z-10 w-full max-w-[720px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7 text-center"
        >
          <div className="font-hand text-[26px] leading-none text-accent">Привет, {profile.name}!</div>
          <h1 className="m-0 mt-2 font-serif text-2xl text-hi md:text-3xl">
            В каком формате поднимаем знания?
          </h1>
          <p className="m-0 mt-2 text-[13px] text-mid">
            Формат можно сменить в любой момент — данные и прогресс общие.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {options.map((o, i) => {
            const active = picked === o.key;
            const Icon = o.icon;
            return (
              <motion.button
                key={o.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
                onClick={() => setPicked(o.key)}
                className="text-left"
              >
                <LiquidGlass
                  className="relative h-full rounded-2xl p-5 transition-all"
                  style={{
                    borderColor: active
                      ? "rgb(var(--accent))"
                      : "rgb(var(--glass-hi) / var(--glass-border-a))",
                    boxShadow: active ? "0 0 40px -10px rgb(var(--accent) / 0.6)" : undefined,
                  }}
                >
                  {active && (
                    <div className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-accent text-[rgb(var(--bg-0))]">
                      <Check size={14} />
                    </div>
                  )}
                  <div className="mb-3 flex h-28 items-center justify-center rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.02)]">
                    {o.preview}
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon size={18} className="text-accent" />
                    <h3 className="m-0 font-serif text-lg text-hi">{o.title}</h3>
                  </div>
                  <p className="m-0 mt-1.5 text-[12.5px] leading-snug text-mid">{o.sub}</p>
                </LiquidGlass>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-7 flex justify-center">
          <button
            onClick={confirm}
            className="glossy-btn flex items-center gap-2 rounded-2xl px-8 py-3.5 text-[15px] font-bold"
          >
            Начать в формате «{picked === "spire" ? "Шпиль" : "Тропа"}»
          </button>
        </div>
      </div>
    </div>
  );
}

/* мини-превью Шпиля — стопка этажей */
function SpirePreview() {
  return (
    <div className="flex flex-col items-center gap-1">
      {[0.55, 0.7, 0.85, 1].map((w, i) => (
        <motion.div
          key={i}
          initial={{ scaleX: 0.4, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.05 * i }}
          className="h-3 rounded"
          style={{
            width: `${w * 70}px`,
            background:
              i === 3
                ? "rgb(var(--accent))"
                : i >= 2
                ? "rgb(var(--accent) / 0.6)"
                : "rgb(var(--glass-hi) / 0.18)",
          }}
        />
      ))}
    </div>
  );
}

/* мини-превью Тропы — змейка узлов */
function PathPreview() {
  const nodes = [0, 1, 2, 3, 4];
  const xs = [0, 26, 14, -10, 4];
  return (
    <svg width="120" height="92" viewBox="0 0 120 92">
      <path
        d="M60 84 C 86 72 86 60 74 50 C 60 40 60 30 74 22 C 84 16 84 8 60 6"
        fill="none"
        stroke="rgb(var(--glass-hi) / 0.2)"
        strokeWidth="3"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      {nodes.map((n) => {
        const y = 84 - n * 19;
        const done = n < 2;
        return (
          <motion.circle
            key={n}
            cx={60 + xs[n]}
            cy={y}
            r="8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.06 * n }}
            fill={
              n === 2 ? "rgb(var(--accent))" : done ? "rgb(var(--accent) / 0.55)" : "rgb(var(--glass-hi) / 0.16)"
            }
            stroke={n === 2 ? "rgb(var(--accent))" : "rgb(var(--line) / 0.4)"}
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
}
