"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Footprints,
  ArrowLeftRight,
  ChevronRight,
  MessageCircle,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/lib/store";

/**
 * Нижняя таб-навигация — «плавающий островок» (mobile-first).
 *
 * 4 пункта: Учёба (Шпиль⇄Тропа повторным тапом) · Чат · Лиги · Профиль.
 * По фидбеку: при ОТКРЫТОМ МОДУЛЕ (шит темы/Inspector) остров улетает влево,
 * чтобы не мешать окошку; вернуть — тап по стрелке у левого края или свайп.
 * Свайп бара влево прячет его снова. Активный пункт — янтарная пилюля.
 */
type TabKey = "study" | "chat" | "leagues" | "profile";

export function BottomTabBar() {
  const screen = useApp((s) => s.screen);
  const viewMode = useApp((s) => s.profile.viewMode);
  const setScreen = useApp((s) => s.setScreen);
  const updateProfile = useApp((s) => s.updateProfile);
  const closeInspector = useApp((s) => s.closeInspector);
  // модуль (тема) открыт в игровом окне → бар уступает место окошку
  const moduleOpen = useApp(
    (s) => !!s.selectedId && (s.screen === "spire" || s.screen === "parent")
  );

  const [collapsed, setCollapsed] = React.useState(false);
  // авто: открыли модуль → бар улетает; закрыли → возвращается
  React.useEffect(() => setCollapsed(moduleOpen), [moduleOpen]);

  // одноразовый коуч-марк: повторный тап по активному табу — неочевидный
  // жест, подсказываем при первом заходе (ревью P1: discoverability формата)
  const [hint, setHint] = React.useState(false);
  React.useEffect(() => {
    try {
      if (localStorage.getItem("egehack.hint.format.v1")) return;
      localStorage.setItem("egehack.hint.format.v1", "1");
      setHint(true);
      const t = setTimeout(() => setHint(false), 7000);
      return () => clearTimeout(t);
    } catch {
      /* приватный режим — просто без подсказки */
    }
  }, []);

  const onStudy = screen === "spire" || screen === "parent";
  const active: TabKey = onStudy ? "study" : (screen as TabKey);
  const isPath = viewMode === "path";

  function goStudy() {
    setHint(false);
    if (onStudy) {
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
    <>
      <nav
        aria-label="Основная навигация"
        className="pointer-events-none fixed inset-x-0 bottom-0 md:hidden"
        style={{
          // над шитом модуля (z-55), чтобы развёрнутый бар был кликабелен
          zIndex: moduleOpen ? 56 : 45,
          paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)",
        }}
      >
        {/* коуч-марк формата (один раз): как переключить Шпиль⇄Тропу */}
        <AnimatePresence>
          {hint && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="pointer-events-none mx-auto mb-2 w-max max-w-[92vw] rounded-full border border-accent/40 bg-[rgb(var(--bg-1)/0.95)] px-3.5 py-2 text-center text-[11.5px] leading-snug text-hi backdrop-blur-md"
            >
              Тапни «{isPath ? "Тропа" : "Шпиль"}» ещё раз — переключишь вид на{" "}
              <b className="text-accent">{isPath ? "Шпиль" : "Тропу"}</b> ⇄
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          className="pointer-events-auto mx-auto w-[min(92vw,400px)]"
          animate={{ x: collapsed ? "-110vw" : "0vw" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          // свайп влево прячет бар (актуально, когда модуль открыт)
          drag={moduleOpen ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.5, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60 || info.velocity.x < -400) setCollapsed(true);
          }}
        >
          <div
            className="liquid-glass flex items-stretch justify-around rounded-[26px] px-1.5"
            style={{
              height: "var(--tabbar-h)",
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
                        ? `${t.label}. Нажми ещё раз, чтобы переключить на ${isPath ? "Шпиль" : "Тропу"}`
                        : `${t.label} — карта знаний` // видимый текст входит в имя (WCAG 2.5.3)
                      : t.label
                  }
                  className="focus-ring relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[20px]"
                >
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
                    {t.key === "study" && on && <ArrowLeftRight size={10} aria-hidden="true" />}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </nav>

      {/* стрелка у левого края — возвращает улетевший бар */}
      <AnimatePresence>
        {moduleOpen && collapsed && (
          <motion.button
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={() => setCollapsed(false)}
            aria-label="Показать навигацию"
            className="focus-ring fixed left-0 z-[56] grid h-12 w-10 place-items-center rounded-r-2xl border border-l-0 md:hidden"
            style={{
              bottom: "calc(env(safe-area-inset-bottom) + 20px)",
              background:
                "linear-gradient(135deg, rgb(var(--glass-hi)/0.1), transparent 50%), rgb(var(--glass-tint)/0.55)",
              borderColor: "rgb(var(--glass-hi) / var(--glass-border-a))",
              backdropFilter: "blur(20px) saturate(170%)",
              WebkitBackdropFilter: "blur(20px) saturate(170%)",
              boxShadow: "0 10px 26px -12px rgba(0,0,0,0.6)",
            }}
          >
            <ChevronRight size={19} className="text-accent" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
