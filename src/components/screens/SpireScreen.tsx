"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Gauge } from "lucide-react";
import { useApp } from "@/lib/store";
import { detectTier, type Tier } from "@/lib/device-tier";
import { isLocked, lockReason, highestOpenIndex, overallReadiness } from "@/lib/floor-build";
import { PixelBloom, type BloomTrigger } from "@/components/spire/PixelBloom";
import { SpireRail } from "@/components/spire/SpireRail";
import { useIsMobile } from "@/lib/use-media";
import { TopBar } from "./TopBar";
import { Console } from "./Console";
import { Inspector } from "./Inspector";
import { ModalHost } from "./ModalHost";
import { PathScreen } from "./PathScreen";
import { MobileSheets } from "./MobileSheets";
import { useToast } from "./Toast";

// 3D грузим лениво и только на клиенте (bundle Three.js/R3F не тащим в SSR).
// Пока бандл едет по сети — силуэт-скелетон Шпиля вместо чёрной пустоты.
const SpireScene = dynamic(
  () => import("@/components/spire/SpireScene").then((m) => m.SpireScene),
  { ssr: false, loading: () => <SpireLoader /> }
);

/** Скелетон загрузки 3D: пульсирующий силуэт башни + подпись. */
function SpireLoader() {
  return (
    <div className="fixed inset-0 z-0 grid place-items-center bg-bg-0" aria-hidden="true">
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col-reverse items-center gap-1.5">
          {[64, 52, 40, 30, 20].map((w, i) => (
            <div
              key={i}
              className="animate-pulse rounded"
              style={{
                width: w,
                height: 10,
                background: "rgb(var(--accent) / 0.35)",
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-mid">
          Строим твой Шпиль…
        </div>
      </div>
    </div>
  );
}

export function SpireScreen() {
  const subject = useApp((s) => s.subject());
  const subjectKey = useApp((s) => s.subjectKey);
  const mode = useApp((s) => s.mode);
  const theme = useApp((s) => s.theme);
  const focusId = useApp((s) => s.focusId);
  const selectedId = useApp((s) => s.selectedId);
  const lightMode = useApp((s) => s.lightMode);
  const selectFloor = useApp((s) => s.selectFloor);
  const closeInspector = useApp((s) => s.closeInspector);
  const setSheet = useApp((s) => s.setSheet);
  const floorById = useApp((s) => s.floorById);
  const viewMode = useApp((s) => s.profile.viewMode);
  const isMobile = useIsMobile();
  const toast = useToast();

  const [tier, setTier] = React.useState<Tier>("high");
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [bloom, setBloom] = React.useState<BloomTrigger | null>(null);
  const [showHint, setShowHint] = React.useState(true);

  const ensureDay = useApp((s) => s.ensureDay);

  React.useEffect(() => {
    setTier(detectTier());
    ensureDay(); // подтянуть гейм-прогресс из localStorage + откатить день
    // reduce-motion слушаем вживую: если юзер включит «уменьшить движение» в ОС
    // прямо во время сессии — Шпиль перестанет крутиться без перезагрузки
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [ensureDay]);

  // авто-выбор ФРОНТИРА (верхний открытый этаж) на ДЕСКТОПЕ — подсвечивает в
  // правом рейле «где ты сейчас». Раньше выбирался последний этаж (босс), но с
  // гейтингом он скрыт, поэтому берём самый верхний открытый.
  // На МОБИЛЕ это открывало bottom-sheet поверх сцены до первого тапа — поэтому
  // на телефоне авто-выбор пропускаем, пусть юзер сам тапнет этаж.
  React.useEffect(() => {
    if (isMobile) return;
    const frontier = subject.floors[highestOpenIndex(subject.floors)] ?? subject.floors[0];
    if (!frontier) return;
    const id = setTimeout(() => selectFloor(frontier.id, { zoom: false }), 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey, isMobile]);

  function handlePick(id: string, clientX: number, clientY: number) {
    const f = floorById(id);
    setShowHint(false);

    // мягкий гейт: заблокированный этаж не открывает тренировку — причина
    // (окно или невыполненные requires) приходит из lockReason()
    const idx = subject.floors.findIndex((x) => x.id === id);
    if (idx >= 0 && isLocked(subject.floors, idx)) {
      toast(`🔒 «${f?.name ?? ""}»: ${lockReason(subject.floors, idx)}`);
      return;
    }

    selectFloor(id, { zoom: true });
    if (!reduceMotion && !lightMode && f) {
      setBloom({ ox: clientX, oy: clientY, hue: f.hue, nonce: Date.now() });
    }
  }

  // Escape возвращает к обзору
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusId) closeInspector();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusId, closeInspector]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg-0">
      {viewMode === "spire" ? (
        <>
          <SpireScene
            subject={subject}
            subjectKey={subjectKey}
            mode={mode}
            theme={theme}
            focusId={focusId}
            selectedId={selectedId}
            lightMode={lightMode}
            reduceMotion={reduceMotion}
            tier={tier}
            onPick={handlePick}
          />

          <PixelBloom trigger={bloom} disabled={reduceMotion || lightMode} />

          {/* мини-карта башни («панель лифта») — DOM, вне canvas */}
          <SpireRail />

          {/* фокус-скрим + виньетка (цвет затемнения берётся из темы) */}
          <div
            className="pointer-events-none fixed inset-0 z-[1] transition-opacity duration-500"
            style={{
              opacity: focusId ? 1 : 0,
              background:
                "radial-gradient(circle at 50% 46%, transparent 22%, rgb(var(--scrim) / .62) 92%)",
            }}
          />
          <div
            className="pointer-events-none fixed inset-0 z-[1]"
            style={{
              background:
                "radial-gradient(120% 90% at 50% 30%, transparent 40%, rgb(var(--scrim) / .55) 100%)",
              mixBlendMode: "multiply",
            }}
          />
        </>
      ) : (
        <PathScreen />
      )}

      <TopBar />

      {/* мобильный чип готовности — на месте бывшего бургера; открывает шит
          «Прогресс» (готовность, прогноз балла, дрожащие зоны, выбор урока) */}
      {isMobile && !focusId && (
        <button
          onClick={() => setSheet("progress")}
          aria-label={`Готовность ${overallReadiness(subject.floors)} процентов — открыть прогресс`}
          className="liquid-glass focus-ring fixed z-[6] flex items-center gap-1.5 rounded-full px-2.5"
          style={{
            position: "fixed", // .liquid-glass перебивает утилиту .fixed — см. Toast.tsx
            top: "max(0.5rem, env(safe-area-inset-top))",
            left: "max(0.5rem, env(safe-area-inset-left))",
            minHeight: 40,
          }}
        >
          <Gauge size={14} className="text-accent" />
          <b className="font-mono text-[12px] text-accent">{overallReadiness(subject.floors)}%</b>
        </button>
      )}

      {/* десктоп/планшет — плавающая консоль; мобайл — шиты (навигация в таб-баре) */}
      {!isMobile && <Console />}
      {isMobile && <MobileSheets />}
      <Inspector />
      <ModalHost />
      {/* CelebrationOverlay смонтирован ГЛОБАЛЬНО в page.tsx (вехи видны везде) */}

      {/* подсказка управления (десктоп и тач — разный текст) */}
      <AnimatePresence>
        {viewMode === "spire" && showHint && mode === "student" && !focusId && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ x: "-50%" }} // framer-y клобберит tailwind-translate
            className="pointer-events-none fixed bottom-[150px] left-1/2 z-[3] whitespace-nowrap rounded-full border border-line bg-panel px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-lo backdrop-blur-md md:bottom-[88px]"
          >
            <span className="hidden md:inline">Тяни — повернуть · колесо — приблизить · </span>
            <span className="text-accent">нажми этаж</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* кнопка возврата к Шпилю */}
      <AnimatePresence>
        {focusId && (
          <motion.button
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onClick={closeInspector}
            style={{ top: "calc(env(safe-area-inset-top) + 56px)", x: "-50%", position: "fixed" }}
            className="liquid-glass focus-ring fixed left-1/2 z-[5] flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-hi"
          >
            <ArrowLeft size={13} /> к Шпилю
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
