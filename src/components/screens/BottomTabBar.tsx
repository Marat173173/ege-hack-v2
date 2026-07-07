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
 * По фидбеку: при ОТКРЫТОМ ОВЕРЛЕЕ (модуль/Inspector, шиты «Прогресс» и
 * «Выбор урока») и на экране ЧАТА остров авто-улетает влево, чтобы не мешать;
 * вернуть — тап по стрелке у левого края или свайп.
 * Свайп бара влево прячет его снова. Активный пункт — янтарная пилюля.
 */
type TabKey = "study" | "chat" | "leagues" | "profile";

export function BottomTabBar() {
  const screen = useApp((s) => s.screen);
  const viewMode = useApp((s) => s.profile.viewMode);
  const setScreen = useApp((s) => s.setScreen);
  const updateProfile = useApp((s) => s.updateProfile);
  const closeInspector = useApp((s) => s.closeInspector);
  // оверлей поверх игрового окна: открыт модуль (Inspector) ИЛИ шит
  // («Прогресс»/«Выбор урока») → бар уступает место окошку
  const overlayOpen = useApp(
    (s) =>
      (!!s.selectedId || s.sheet !== null) &&
      (s.screen === "spire" || s.screen === "parent")
  );
  // экран чата: бар присутствует, но авто-спрятан (фокус на переписке)
  const chatOpen = screen === "chat";
  // модалка (урок/разбор): бар — сиблинг fixed-корня SpireScreen и на мобиле
  // рисуется ПОВЕРХ модалки (разные stacking context) → прячем при модалке
  const modalOpen = useApp((s) => s.modal !== null);
  const autoHide = overlayOpen || chatOpen || modalOpen;

  const [collapsed, setCollapsed] = React.useState(false);
  // авто: открыли оверлей/чат → бар улетает; закрыли → возвращается
  React.useEffect(() => setCollapsed(autoHide), [autoHide]);

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
  const sheet = useApp((s) => s.sheet);
  const setSheet = useApp((s) => s.setSheet);
  const selectedId = useApp((s) => s.selectedId);

  function goStudy() {
    setHint(false);
    if (onStudy) {
      // открыт шит/модуль → тап по «Учёбе» закрывает оверлей,
      // а НЕ переключает формат под ним (иначе смена вида невидима)
      if (sheet !== null || selectedId) {
        setSheet(null);
        closeInspector();
        return;
      }
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
    {
      key: "chat",
      icon: MessageCircle,
      label: "Чат",
      // уже в чате → тап по «Чат» сворачивает бар (иначе он лёг бы на инпут)
      go: () => (screen === "chat" ? setCollapsed(true) : setScreen("chat")),
    },
    { key: "leagues", icon: Trophy, label: "Лиги", go: () => setScreen("leagues") },
    { key: "profile", icon: User, label: "Профиль", go: () => setScreen("profile") },
  ];

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="pointer-events-none fixed inset-x-0 bottom-0 md:hidden"
        style={{
          // над Inspector (z-55) и шитами BottomSheet (z-58), но под
          // модалками (z-60) — развёрнутый бар кликабелен поверх оверлеев
          zIndex: autoHide ? 59 : 45,
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
          // свайп влево прячет бар (актуально при оверлее/чате)
          drag={autoHide ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.5, right: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60 || info.velocity.x < -400) setCollapsed(true);
          }}
        >
          <div
            // спрятанный за экраном бар не должен быть в порядке фокуса/скринридера
            aria-hidden={collapsed || undefined}
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
                  tabIndex={collapsed ? -1 : 0}
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
        {autoHide && collapsed && (
          <motion.button
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={() => setCollapsed(false)}
            aria-label="Показать навигацию"
            className="focus-ring fixed left-0 z-[59] grid h-12 w-10 place-items-center rounded-r-2xl border border-l-0 md:hidden"
            style={{
              // на чате хэндл поднят над полем ввода, иначе перекроет инпут
              bottom: chatOpen
                ? "calc(env(safe-area-inset-bottom) + 92px)"
                : "calc(env(safe-area-inset-bottom) + 20px)",
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
