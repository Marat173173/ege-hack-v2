"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Footprints,
  ArrowLeftRight,
  MessageCircle,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/lib/store";

/**
 * Нижняя таб-навигация — «плавающий островок» (mobile-first).
 *
 * По фидбеку: Шпиль/Тропа — НЕ два раздела, а один таб «карта знаний»
 * с кнопкой-переключателем формата (повторный тап по активному табу
 * переключает Шпиль ⇄ Тропа). Бар отлеплен от краёв (остров), стекло
 * прозрачнее фирменного liquid-glass — «парит» над сценой.
 * Активный пункт: янтарная пилюля + жирный вес (не только цвет). Safe-area.
 */
type TabKey = "study" | "chat" | "leagues" | "profile";

export function BottomTabBar() {
  const screen = useApp((s) => s.screen);
  const viewMode = useApp((s) => s.profile.viewMode);
  const setScreen = useApp((s) => s.setScreen);
  const updateProfile = useApp((s) => s.updateProfile);
  const closeInspector = useApp((s) => s.closeInspector);

  const onStudy = screen === "spire" || screen === "parent";
  const active: TabKey = onStudy ? "study" : (screen as TabKey);
  const isPath = viewMode === "path";

  function goStudy() {
    if (onStudy) {
      // уже на карте знаний → тап работает как переключатель формата
      closeInspector();
      updateProfile({ viewMode: isPath ? "spire" : "path", viewChosen: true });
    } else {
      setScreen("spire");
    }
  }

  const tabs: { key: TabKey; icon: LucideIcon; label: string; go: () => void }[] = [
    {
      key: "study",
      icon: isPath ? Footprints : Building2,
      label: isPath ? "Тропа" : "Шпиль",
      go: goStudy,
    },
    { key: "chat", icon: MessageCircle, label: "Чат", go: () => setScreen("chat") },
    { key: "leagues", icon: Trophy, label: "Лиги", go: () => setScreen("leagues") },
    { key: "profile", icon: User, label: "Профиль", go: () => setScreen("profile") },
  ];

  return (
    <nav
      aria-label="Основная навигация"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] md:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <div
        className="liquid-glass pointer-events-auto mx-auto flex w-[min(92vw,400px)] items-stretch justify-around rounded-[26px] px-1.5"
        style={{
          height: "var(--tabbar-h)",
          // прозрачнее фирменного стекла — сцена просвечивает сквозь остров
          background:
            "linear-gradient(135deg, rgb(var(--glass-hi)/0.12), rgb(var(--glass-hi)/0.02) 45%, rgb(var(--glass-hi)/0.07)), rgb(var(--glass-tint)/0.38)",
          backdropFilter: "blur(26px) saturate(180%)",
          WebkitBackdropFilter: "blur(26px) saturate(180%)",
          boxShadow:
            "0 18px 42px -18px rgba(0,0,0,0.6), inset 0 1px 0 rgb(var(--glass-hi)/0.3)",
        }}
      >
        {tabs.map((t) => {
          const on = active === t.key;
          const Icon = t.icon;
          const color = on ? "rgb(var(--accent))" : "rgb(var(--mid))";
          return (
            <button
              key={t.key}
              onClick={t.go}
              aria-current={on ? "page" : undefined}
              aria-label={
                t.key === "study"
                  ? on
                    ? `Формат: ${isPath ? "Тропа" : "Шпиль"}. Нажми, чтобы переключить на ${isPath ? "Шпиль" : "Тропу"}`
                    : "Карта знаний"
                  : t.label
              }
              className="focus-ring relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[20px]"
            >
              {/* активная пилюля — форма дублирует цвет (не только цвет) */}
              {on && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-x-1 inset-y-1.5 rounded-[16px]"
                  style={{
                    background: "rgb(var(--accent) / 0.13)",
                    border: "1px solid rgb(var(--accent) / 0.28)",
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon size={21} strokeWidth={on ? 2.5 : 2} style={{ color }} className="relative" />
              <span
                className="relative flex items-center gap-1 text-[11px] leading-none"
                style={{ color, fontWeight: on ? 700 : 500 }}
              >
                {t.label}
                {/* подсказка: активный таб «учёбы» переключает формат */}
                {t.key === "study" && on && <ArrowLeftRight size={10} aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
