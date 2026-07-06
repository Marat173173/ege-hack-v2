"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Footprints,
  MessageCircle,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/lib/store";

/**
 * Постоянная нижняя таб-навигация (mobile-first).
 *
 * Заменяет прежний «бургер + раскрывающееся облако»: 5 разделов всегда видны
 * в зоне большого пальца, активный подсвечен янтарём + верхней риской (не только
 * цвет). Стекло бренда (.liquid-glass), safe-area снизу. Reduced-motion — через
 * глобальный <MotionConfig reducedMotion="user"> в page.tsx.
 *
 * «Шпиль» и «Тропа» — это один screen="spire" с разным profile.viewMode.
 */
type TabKey = "spire" | "path" | "chat" | "leagues" | "profile";

export function BottomTabBar() {
  const screen = useApp((s) => s.screen);
  const viewMode = useApp((s) => s.profile.viewMode);
  const setScreen = useApp((s) => s.setScreen);
  const updateProfile = useApp((s) => s.updateProfile);
  const closeInspector = useApp((s) => s.closeInspector);

  const active: TabKey =
    screen === "spire" || screen === "parent"
      ? viewMode === "path"
        ? "path"
        : "spire"
      : (screen as TabKey);

  const tabs: { key: TabKey; icon: LucideIcon; label: string; go: () => void }[] = [
    {
      key: "spire",
      icon: Building2,
      label: "Шпиль",
      go: () => {
        closeInspector();
        updateProfile({ viewMode: "spire", viewChosen: true });
        setScreen("spire");
      },
    },
    {
      key: "path",
      icon: Footprints,
      label: "Тропа",
      go: () => {
        closeInspector();
        updateProfile({ viewMode: "path", viewChosen: true });
        setScreen("spire");
      },
    },
    { key: "chat", icon: MessageCircle, label: "Чат", go: () => setScreen("chat") },
    { key: "leagues", icon: Trophy, label: "Лиги", go: () => setScreen("leagues") },
    { key: "profile", icon: User, label: "Профиль", go: () => setScreen("profile") },
  ];

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-[45] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="liquid-glass flex items-stretch justify-around rounded-none border-x-0 border-b-0"
        style={{ height: "var(--tabbar-h)" }}
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
              aria-label={t.label}
              className="focus-ring relative flex flex-1 flex-col items-center justify-center gap-1"
            >
              {/* активная риска сверху — дублирует цвет формой (не только цвет) */}
              {on && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute top-0 h-[2.5px] w-8 rounded-full"
                  style={{ background: "rgb(var(--accent))" }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon size={22} strokeWidth={on ? 2.6 : 2} style={{ color }} />
              <span
                className="text-[11px] leading-none"
                style={{ color, fontWeight: on ? 700 : 500 }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
