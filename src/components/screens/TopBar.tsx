"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame, CalendarClock, MessageCircle, Building2, Footprints } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { XpRing } from "@/components/ui/xp-ring";
import { SubjectBubbles } from "./SubjectBubbles";
import { useApp } from "@/lib/store";
import { levelProgress } from "@/lib/gamification";

export function TopBar() {
  const mode = useApp((s) => s.mode);
  const setMode = useApp((s) => s.setMode);
  const lightMode = useApp((s) => s.lightMode);
  const toggleLight = useApp((s) => s.toggleLight);
  const subject = useApp((s) => s.subject());
  const game = useApp((s) => s.game);
  const xpPing = useApp((s) => s.xpPing);
  const setScreen = useApp((s) => s.setScreen);
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const closeInspector = useApp((s) => s.closeInspector);

  const lvl = levelProgress(game.xp);
  const dailyRatio = game.dailyGoal > 0 ? game.dailyXp / game.dailyGoal : 0;

  // авто-очистка всплывашки +XP, чтобы она улетала, а не «зависала»
  React.useEffect(() => {
    if (!xpPing) return;
    const t = setTimeout(() => useApp.setState({ xpPing: null }), 850);
    return () => clearTimeout(t);
  }, [xpPing]);

  return (
    <>
      {/* left: brand + subject tabs.
          На мобилке слева сверху стоит чип готовности (из SpireScreen) —
          отступаем вправо, чтобы пилюля предмета не налезала на него. */}
      <div
        className="pointer-events-auto fixed left-2 top-2 z-[4] flex max-w-[calc(100%-180px)] flex-nowrap items-center gap-2 pl-[74px] md:left-4 md:top-4 md:max-w-[calc(100%-16px)] md:flex-wrap md:gap-3 md:pl-0"
        style={{ top: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        {/* бренд — логотип-Шпиль виден только на десктопе (на мобилке его роль
            у бургер-кнопки слева внизу) */}
        <div className="hidden items-center gap-2.5 md:flex">
          <div className="relative h-[34px] w-[34px] shrink-0">
            <span className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 rounded bg-gradient-to-b from-accent to-transparent" />
            <span className="absolute left-1/2 top-[7px] h-[3px] w-[18px] -translate-x-1/2 rounded bg-accent opacity-90" />
            <span className="absolute left-1/2 top-[15px] h-[3px] w-[26px] -translate-x-1/2 rounded bg-accent opacity-90" />
            <span className="absolute left-1/2 top-[23px] h-[3px] w-[14px] -translate-x-1/2 rounded bg-accent opacity-50" />
          </div>
          <div className="leading-none">
            <div className="font-mono text-[15px] font-bold tracking-[0.32em] text-hi">
              ЕГЭ·ХАК
            </div>
            <div className="mt-1 font-mono text-[9.5px] tracking-[0.34em] text-lo">
              INTERACTIVE · SHPIL
            </div>
          </div>
        </div>

        {/* subject — пилюля активного предмета; тап → пузырьки по всему экрану */}
        <SubjectBubbles />

        {/* mode switch — на мобиле скрыт (переключается в ЛК) */}
        <div className="hidden items-center gap-2 font-mono text-[10.5px] uppercase tracking-wide text-lo md:flex">
          Ученик
          <button
            role="switch"
            aria-checked={mode === "parent"}
            onClick={() => setMode(mode === "parent" ? "student" : "parent")}
            className="relative h-6 w-[46px] rounded-full border border-line bg-panel"
          >
            <span
              className="absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full transition-transform"
              style={{
                transform: mode === "parent" ? "translateX(22px)" : "translateX(0)",
                background: mode === "parent" ? "#5BE3B0" : "rgb(var(--accent))",
              }}
            />
          </button>
          Родитель
        </div>
      </div>

      {/* right: гейм-метрики + переключатель темы */}
      <div
        className="pointer-events-auto fixed right-2 top-2 z-[4] flex items-center gap-1.5 md:right-4 md:top-4 md:gap-2"
        style={{ top: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        {/* XP-кольцо дневной цели (как Apple Fitness) */}
        <div className="relative flex min-h-[44px] items-center gap-2 rounded-xl border border-line bg-panel px-2 py-1.5 backdrop-blur-md md:px-2.5">
          <XpRing ratio={dailyRatio} level={lvl.level} />
          {/* текст цели — скрыт на мобиле (есть в нижнем баре) */}
          <div className="hidden pr-0.5 md:block">
            <div className="hud-label text-[8px] text-lo">Цель дня</div>
            <b className="font-mono text-[12px] text-hi">
              {game.dailyXp}
              <span className="text-lo">/{game.dailyGoal}</span>
            </b>
          </div>
          {/* всплывашка +XP */}
          <AnimatePresence>
            {xpPing && (
              <motion.div
                key={xpPing.id}
                initial={{ opacity: 0, y: 4, scale: 0.7 }}
                animate={{ opacity: 1, y: -18, scale: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.8 }}
                className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 font-mono text-[12px] font-bold text-accent"
              >
                +{xpPing.amount}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* живой огонёк серии */}
        <motion.div
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-line bg-panel px-2.5 py-2 backdrop-blur-md"
          title="Серия дней"
        >
          <motion.span
            animate={{ scale: [1, 1.18, 1], rotate: [0, -6, 6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: "inline-flex" }}
          >
            <Flame size={16} className="text-warn" style={{ filter: "drop-shadow(0 0 5px rgba(255,198,91,.7))" }} />
          </motion.span>
          <b className="text-[15px] font-bold text-hi">{game.streak}</b>
        </motion.div>

        <div className="hidden min-h-[44px] rounded-xl border border-line bg-panel px-3 py-2 backdrop-blur-md md:block">
          <div className="flex items-center gap-1 hud-label text-[8.5px] text-lo">
            <CalendarClock size={9} /> До ЕГЭ
          </div>
          <b className="text-[15px] font-bold text-hi">{subject.days} дн</b>
        </div>

        {/* мессенджер (на мобиле — в нижнем баре) */}
        <button
          onClick={() => setScreen("chat")}
          aria-label="Сообщения"
          title="Сообщения"
          className="hidden h-11 w-11 place-items-center rounded-xl border border-line bg-panel text-mid backdrop-blur-md transition-colors hover:text-hi md:grid"
        >
          <MessageCircle size={18} />
        </button>

        {/* аватар → личный кабинет (на мобиле — в нижнем баре) */}
        <button
          onClick={() => setScreen("profile")}
          aria-label="Личный кабинет"
          title={profile.name}
          className="hidden h-11 w-11 place-items-center rounded-xl text-[20px] transition-transform hover:scale-105 md:grid"
          style={{
            background: `hsl(${profile.avatarHue} 70% 55% / 0.18)`,
            border: `1.5px solid hsl(${profile.avatarHue} 70% 55% / 0.55)`,
          }}
        >
          {profile.avatarEmoji}
        </button>

        <ThemeToggle />
      </div>

      {/* переключатель формата: Шпиль ⇄ Тропа */}
      <div className="pointer-events-auto fixed bottom-3 left-3 z-[4] hidden overflow-hidden rounded-xl border border-line bg-panel backdrop-blur-md md:bottom-4 md:left-4 md:flex">
        {([
          ["spire", "Шпиль", Building2],
          ["path", "Тропа", Footprints],
        ] as const).map(([k, label, Ico]) => {
          const on = profile.viewMode === k;
          return (
            <button
              key={k}
              onClick={() => {
                closeInspector();
                updateProfile({ viewMode: k, viewChosen: true });
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-colors"
              style={{
                background: on ? "rgb(var(--accent) / 0.16)" : "transparent",
                color: on ? "rgb(var(--accent))" : "rgb(var(--mid))",
              }}
            >
              <Ico size={14} /> {label}
            </button>
          );
        })}
      </div>

      {/* light mode toggle */}
      <button
        onClick={toggleLight}
        aria-pressed={lightMode}
        title="Лёгкий режим — меньше нагрузки на устройство"
        className="pointer-events-auto fixed bottom-3 right-3 z-[4] hidden rounded-xl border border-line bg-panel px-3 py-2 font-mono text-[10px] uppercase tracking-wide backdrop-blur-md transition-colors md:bottom-4 md:right-4 md:block"
        style={{ color: lightMode ? "rgb(var(--accent))" : "rgb(var(--mid))" }}
      >
        {lightMode ? "● Лёгкий режим" : "○ Лёгкий режим"}
      </button>
    </>
  );
}
