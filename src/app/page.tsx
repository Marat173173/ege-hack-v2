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
import { DiagnosticScreen } from "@/components/screens/DiagnosticScreen";
import { BottomTabBar } from "@/components/screens/BottomTabBar";
import { CelebrationOverlay } from "@/components/screens/CelebrationOverlay";
import { TutorNudgeToast } from "@/components/screens/TutorNudgeToast";

/** Экраны, где показываем постоянный нижний таб-бар (главные разделы).
 *  На чате бар есть, но авто-спрятан влево (стрелка возвращает).
 *  Solve/интро — фокус-контексты со своим «назад», бар там скрыт. */
const TABBAR_SCREENS = ["spire", "parent", "leagues", "profile", "chat"] as const;

/** Экраны, где превью «репетитор пишет» неуместно (фокус-контексты и интро). */
const NUDGE_HIDDEN_SCREENS = ["solve", "landing", "onboarding", "diagnostic", "format"] as const;

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

/**
 * «Чернильный» вариант акцента для ТЕКСТА в светлой теме: тот же оттенок,
 * но светлота прижата до ~26% — иначе янтарь/циан на светлом фоне дают
 * контраст ~2:1 и лейблы не читаются. Применяется через --accent-ink +
 * override .text-accent в globals.css (только [data-theme="light"]).
 */
function accentInk(triple: string): string {
  const [r, g, b] = triple.split(/\s+/).map((n) => Number(n) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return hueToRgb((h + 360) % 360, Math.min(100, s * 100), 26);
}

export default function Page() {
  const screen = useApp((s) => s.screen);
  const subjectKey = useApp((s) => s.subjectKey);
  const mode = useApp((s) => s.mode);
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const avatarHue = useApp((s) => s.profile.avatarHue);
  const soundOn = useApp((s) => s.profile.sound);
  const hydrateNudge = useApp((s) => s.hydrateNudge);
  const showNudge = useApp((s) => s.showNudge);
  const hideNudge = useApp((s) => s.hideNudge);
  const nudgeVisible = useApp((s) => s.nudgeVisible);
  const nudgeStatus = useApp((s) => s.tutorNudge?.status);
  // не чаще раза в 90с — иначе превью превращается в спам
  const nudgeShownAt = React.useRef(0);

  // настройка звука из профиля → модуль звука
  React.useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  // подтянуть «сообщение репетитора» из localStorage (переживает перезагрузку)
  React.useEffect(() => hydrateNudge(), [hydrateNudge]);

  // триггер показа: на Шпиле с неотвеченным предложением — превью через 5с.
  // Покрывает и «после итогов» (finish → spire), и «при каждом заходе».
  React.useEffect(() => {
    if (screen !== "spire" || nudgeStatus !== "pending") return;
    // не чаще раза в 90с, но по истечении окна тост показываем и на ТЕКУЩЕМ
    // визите (раньше при двух быстрых сессиях подряд показ терялся до
    // следующей смены экрана)
    const wait = Math.max(5000, 90_000 - (Date.now() - nudgeShownAt.current));
    const t = setTimeout(() => {
      nudgeShownAt.current = Date.now();
      showNudge();
    }, wait);
    return () => clearTimeout(t);
  }, [screen, nudgeStatus, showNudge]);

  // guard: на фокус-экранах уже показанное превью прячем (статус остаётся pending)
  React.useEffect(() => {
    if (nudgeVisible && (NUDGE_HIDDEN_SCREENS as readonly string[]).includes(screen)) {
      hideNudge();
    }
  }, [screen, nudgeVisible, hideNudge]);

  // тема: акцент выводится из палитры предмета в реестре (работает для ЛЮБОГО
  // числа предметов) + спокойный родительский режим. Вторичный акцент (--accent-2,
  // используется ореолом/пьедесталом Шпиля) тонируется под аватар — персонализация.
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-subject", subjectKey);
    root.setAttribute("data-mode", mode);
    const { accent } = accentForKey(subjectKey);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-ink", accentInk(accent));
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
            {screen === "diagnostic" && <DiagnosticScreen />}
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

        {/* празднования — ГЛОБАЛЬНО (не только на Шпиле): вехи видны в момент
            достижения, в т.ч. во время тренировки; очередь дренируется, а не
            копится в лавину */}
        <CelebrationOverlay />

        {/* превью «репетитор пишет» — глобально, поверх празднований;
            сам рендерится только при nudgeVisible && status === "pending" */}
        <TutorNudgeToast />
      </ToastProvider>
    </MotionConfig>
  );
}
