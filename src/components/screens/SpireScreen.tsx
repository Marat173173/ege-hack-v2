"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/lib/store";
import { detectTier, prefersReducedMotion, type Tier } from "@/lib/device-tier";
import { isLocked, unlockGap } from "@/lib/floor-build";
import { PixelBloom, type BloomTrigger } from "@/components/spire/PixelBloom";
import { useIsMobile } from "@/lib/use-media";
import { TopBar } from "./TopBar";
import { Console } from "./Console";
import { Inspector } from "./Inspector";
import { ModalHost } from "./ModalHost";
import { CelebrationOverlay } from "./CelebrationOverlay";
import { PathScreen } from "./PathScreen";
import { MobileBottomBar } from "./MobileBottomBar";
import { MobileSheets } from "./MobileSheets";
import { useToast } from "./Toast";

// 3D грузим лениво и только на клиенте (bundle Three.js/R3F не тащим в SSR)
const SpireScene = dynamic(
  () => import("@/components/spire/SpireScene").then((m) => m.SpireScene),
  { ssr: false }
);

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
    setReduceMotion(prefersReducedMotion());
    ensureDay(); // подтянуть гейм-прогресс из localStorage + откатить день
  }, [ensureDay]);

  // выбор первого «боссового» этажа без наезда, чтобы ценность была в один тап
  React.useEffect(() => {
    const last = subject.floors[subject.floors.length - 1];
    const id = setTimeout(() => selectFloor(last.id, { zoom: false }), 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey]);

  function handlePick(id: string, clientX: number, clientY: number) {
    const f = floorById(id);
    setShowHint(false);

    // мягкий гейт: заблокированный этаж не открывает тренировку — показываем,
    // что нужно укрепить нижние этажи
    const idx = subject.floors.findIndex((x) => x.id === id);
    if (idx >= 0 && isLocked(subject.floors, idx)) {
      const gap = unlockGap(subject.floors, idx);
      toast(
        `🔒 «${f?.name ?? ""}» пока закрыт. Укрепи нижние темы ещё на <b>~${gap}%</b> готовности, чтобы открыть.`
      );
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
      {/* десктоп/планшет — плавающая консоль; мобайл — нижний бар + шиты */}
      {!isMobile && <Console />}
      {isMobile && (
        <>
          <MobileBottomBar />
          <MobileSheets />
        </>
      )}
      <Inspector />
      <ModalHost />
      <CelebrationOverlay />

      {/* подсказка управления (десктоп и тач — разный текст) */}
      <AnimatePresence>
        {viewMode === "spire" && showHint && mode === "student" && !focusId && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed bottom-[150px] left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-panel px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-lo backdrop-blur-md md:bottom-[88px]"
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
            className="liquid-glass fixed left-1/2 top-16 z-[5] flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-hi"
          >
            <ArrowLeft size={13} /> к Шпилю
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
