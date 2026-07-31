"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
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
  // открыт ли правый рейл-инспектор (то же условие, что в Inspector.tsx)
  const inspectorOpen = useApp((s) => s.mode === "parent" || !!s.selectedId);

  // «Гость» — только когда сессия точно загружена и пуста: на status "loading"
  // точку не рисуем, иначе она мигала бы при каждом заходе
  const { status } = useSession();
  const isGuest = status === "unauthenticated";

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
      {/* ВЕРХНЯЯ ПАНЕЛЬ — ОДИН flex-ряд, а не два независимых fixed-кластера.
          Раньше левый и правый блока не знали ширины друг друга: на мобиле
          резерв был прибит вручную (max-w calc(100%-180px) при реальных 181px
          справа), а на md снимался совсем — и с 768px до ~1045px правый блок
          физически ложился на левый, накрывая переключатель Ученик/Родитель.
          Теперь justify-between + min-w-0 слева гарантируют, что группы
          расталкиваются, а не перекрываются, на любой ширине.

          Обёртка pointer-events-none: иначе прозрачный контейнер во всю ширину
          экрана съедал бы клики по 3D-сцене в верхней полосе.
          Отступ сверху — классом (не инлайном), иначе инлайн перебивал md:top-4
          и на десктопе получалось 8px сверху при 16px по бокам. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[4] flex items-center justify-between gap-2 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:gap-4 md:px-4 md:pt-[max(1rem,env(safe-area-inset-top))]">
        {/* ——— левая группа: бренд + предмет + режим ———
            На мобилке слева сверху стоит чип готовности (из SpireScreen) —
            отступаем вправо, чтобы пилюля предмета не налезала на него. */}
        <div className="pointer-events-auto flex min-w-0 flex-nowrap items-center gap-2 pl-[74px] md:gap-3 md:pl-0">
          {/* бренд — логотип-Шпиль. Показываем с lg: на 768–1023px места на все
              три элемента слева не хватает, и первым уступает декоративный бренд */}
          <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
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

          {/* mode switch — до xl скрыт (ниже переключается в «Личном кабинете»).
              Порог именно xl: на 1024–1068px левая группа с брендом, предметом и
              этим свитчем не влезает, её контент вытекал за свой бокс и подпись
              «Родитель» уходила под непрозрачную XP-пилюлю. */}
          <div className="hidden shrink-0 items-center gap-2 font-mono text-[10.5px] uppercase tracking-wide text-lo xl:flex">
            Ученик
            <button
              role="switch"
              aria-checked={mode === "parent"}
              aria-label="Режим родителя"
              onClick={() => setMode(mode === "parent" ? "student" : "parent")}
              className="relative h-6 w-[46px] shrink-0 rounded-full border border-line bg-panel"
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

        {/* ——— правая группа: метрики + действия ———
            Две смысловые подгруппы с разным зазором: слева «что у меня
            происходит» (цель, серия, срок), справа «куда я могу пойти»
            (сообщения, аккаунт, тема).
            У всех детей ровно h-11 = 44px: раньше пилюли были 52 / 44 / 55,3px
            и ряд выглядел рваным — min-h-[44px] не помогал, потому что высоту
            задавало содержимое (кольцо 38px + паддинги, две строки текста). */}
        <div className="pointer-events-auto flex shrink-0 items-center gap-2 md:gap-3">
          {/* метрики. relative — якорь для всплывашки +XP: она вынесена из
              XP-пилюли, потому что пилюля скрывается на узких экранах, а награду
              за решённое задание надо показывать на любой ширине. */}
          <div className="relative flex items-center gap-1.5 md:gap-2">
            {/* Всплывашка +XP. Летит ВНИЗ из-под ряда: пилюли прижаты к верхней
                кромке экрана, и прежний полёт вверх (y:-18 от top:0) уводил
                награду за пределы окна — её просто не было видно. */}
            <AnimatePresence>
              {xpPing && (
                <motion.div
                  key={xpPing.id}
                  initial={{ opacity: 0, y: -6, scale: 0.7 }}
                  animate={{ opacity: 1, y: 6, scale: 1 }}
                  exit={{ opacity: 0, y: 18 }}
                  transition={{ duration: 0.8 }}
                  style={{ x: "-50%" }} // framer-y/scale клобберит tailwind-translate
                  className="pointer-events-none absolute left-1/2 top-full z-[1] font-mono text-[12px] font-bold text-accent"
                >
                  +{xpPing.amount}
                </motion.div>
              )}
            </AnimatePresence>

            {/* XP-кольцо дневной цели (как Apple Fitness).
                Ниже 400px прячем: в полосе 320–399px не помещаются разом чип
                готовности, пилюля предмета, XP, серия и тема — и название
                предмета усыхало до «Р…». Полное имя предмета важнее: оно задаёт
                контекст всему экрану, а уровень и цель дня целиком есть в
                «Личном кабинете». Серия остаётся на любой ширине. */}
            <div className="hidden h-11 items-center gap-2 rounded-xl border border-line bg-panel px-2 backdrop-blur-md min-[400px]:flex md:px-2.5">
              <XpRing ratio={dailyRatio} level={lvl.level} />
              {/* текст цели — скрыт на мобиле (есть в нижнем баре) */}
              <div className="hidden pr-0.5 leading-none md:block">
                <div className="hud-label text-[9px] text-mid">Цель дня</div>
                <b className="mt-1 block font-mono text-[12px] leading-none text-hi">
                  {game.dailyXp}
                  <span className="text-lo">/{game.dailyGoal}</span>
                </b>
              </div>
            </div>

            {/* живой огонёк серии */}
            <motion.div
              data-tour="topbar-streak"
              className="flex h-11 items-center gap-1.5 rounded-xl border border-line bg-panel px-2.5 backdrop-blur-md"
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

            <div className="hidden h-11 flex-col justify-center rounded-xl border border-line bg-panel px-3 leading-none backdrop-blur-md md:flex">
              <div className="flex items-center gap-1 hud-label text-[9px] text-mid">
                <CalendarClock size={10} /> До ЕГЭ
              </div>
              <b className="mt-1 text-[14px] font-bold leading-none text-hi">{subject.days} дн</b>
            </div>
          </div>

          {/* действия */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* мессенджер (на мобиле — в нижнем баре) */}
            <button
              onClick={() => setScreen("chat")}
              aria-label="Сообщения"
              title="Сообщения"
              className="hidden h-11 w-11 place-items-center rounded-xl border border-line bg-panel text-mid backdrop-blur-md transition-colors hover:text-hi md:grid"
            >
              <MessageCircle size={18} />
            </button>

            {/* Аккаунт — ЕДИНСТВЕННАЯ точка входа в учётную запись на десктопе
                (на мобиле та же точка — вкладка «Профиль» в нижнем баре).
                Ведёт в «Личный кабинет», где лежит блок входа и регистрации.
                Гостю показываем янтарную точку — «прогресс не сохраняется». */}
            <button
              onClick={() => setScreen("profile")}
              aria-label={isGuest ? "Аккаунт — войти или зарегистрироваться" : "Личный кабинет"}
              title={isGuest ? "Аккаунт — вход и регистрация" : profile.name}
              className="relative hidden h-11 w-11 place-items-center rounded-xl text-[20px] transition-transform hover:scale-105 md:grid"
              style={{
                background: `hsl(${profile.avatarHue} 70% 55% / 0.18)`,
                border: `1.5px solid hsl(${profile.avatarHue} 70% 55% / 0.55)`,
              }}
            >
              {profile.avatarEmoji}
              {isGuest && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent"
                  style={{ boxShadow: "0 0 0 2px rgb(var(--bg-0))" }}
                />
              )}
            </button>

            <ThemeToggle />
          </div>
        </div>
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

      {/* light mode toggle. Когда справа открыт рейл-инспектор (выбран этаж
          или родительский режим), уезжает левее — раньше панель накрывала
          кнопку наполовину и это выглядело как сломанная вёрстка. */}
      <button
        onClick={toggleLight}
        aria-pressed={lightMode}
        title="Лёгкий режим — меньше нагрузки на устройство"
        className="pointer-events-auto fixed bottom-3 z-[4] hidden rounded-xl border border-line bg-panel px-3 py-2 font-mono text-[10px] uppercase tracking-wide backdrop-blur-md transition-all duration-300 md:bottom-4 md:block"
        style={{
          color: lightMode ? "rgb(var(--accent))" : "rgb(var(--mid))",
          right: inspectorOpen ? 408 : 16,
        }}
      >
        {lightMode ? "● Лёгкий режим" : "○ Лёгкий режим"}
      </button>
    </>
  );
}
