"use client";

import * as React from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useApp } from "@/lib/store";
import { accentForKey } from "@/data/catalog";
import { setSoundEnabled } from "@/lib/sound";
import { ToastProvider } from "@/components/screens/Toast";
import { Landing } from "@/components/screens/Landing";
import { Onboarding } from "@/components/screens/Onboarding";
import { SpireScreen } from "@/components/screens/SpireScreen";
import { Solve } from "@/components/screens/Solve";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
import { ChatScreen } from "@/components/screens/ChatScreen";
import { FormatChoiceScreen } from "@/components/screens/FormatChoiceScreen";
import { LeaguesScreen } from "@/components/screens/LeaguesScreen";
import { BottomTabBar } from "@/components/screens/BottomTabBar";

/** Экраны, где показываем постоянный нижний таб-бар (главные разделы).
 *  Чат/Solve/интро — фокус-контексты со своим «назад», бар там скрыт. */
const TABBAR_SCREENS = ["spire", "parent", "leagues", "profile"] as const;

/** HSL hue → "r g b" (полная насыщенность, для вторичного акцента). */
function hueToRgb(h: number, s = 70, l = 58): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `${f(0)} ${f(8)} ${f(4)}`;
}

export default function Page() {
  const screen = useApp((s) => s.screen);
  const subjectKey = useApp((s) => s.subjectKey);
  const mode = useApp((s) => s.mode);
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const avatarHue = useApp((s) => s.profile.avatarHue);
  const soundOn = useApp((s) => s.profile.sound);

  // настройка звука из профиля → модуль звука
  React.useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  // тема: акцент выводится из палитры предмета в реестре (работает для ЛЮБОГО
  // числа предметов) + спокойный родительский режим. Вторичный акцент (--accent-2,
  // используется ореолом/пьедесталом Шпиля) тонируется под аватар — персонализация.
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-subject", subjectKey);
    root.setAttribute("data-mode", mode);
    const { accent } = accentForKey(subjectKey);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-2", hueToRgb(avatarHue));
  }, [subjectKey, mode, avatarHue]);

  // светлая/тёмная тема → data-theme на <html>
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // применяем системную тему ПОСЛЕ маунта (на сервере темы нет → стартуем с dark,
  // здесь подхватываем реальную) и следим за её сменой
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    setTheme(mq.matches ? "light" : "dark");
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? "light" : "dark");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [setTheme]);

  return (
    // reducedMotion="user": при включённом «Reduce Motion» в ОС framer-motion
    // сам гасит transform/layout-анимации (тряску, пульс, слайды, дрейф пузырей)
    // во всём дереве — глобальный фикс вместо правок в каждом компоненте.
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {screen === "landing" && <Landing />}
            {screen === "onboarding" && <Onboarding />}
            {screen === "format" && <FormatChoiceScreen />}
            {(screen === "spire" || screen === "parent") && <SpireScreen />}
            {screen === "solve" && <Solve />}
            {screen === "profile" && <ProfileScreen />}
            {screen === "chat" && <ChatScreen />}
            {screen === "leagues" && <LeaguesScreen />}
          </motion.div>
        </AnimatePresence>

        {/* постоянная нижняя навигация (мобилка) — вне AnimatePresence, чтобы
            не перемонтироваться и не мигать при смене экрана */}
        {(TABBAR_SCREENS as readonly string[]).includes(screen) && <BottomTabBar />}
      </ToastProvider>
    </MotionConfig>
  );
}
