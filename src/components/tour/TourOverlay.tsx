"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useApp } from "@/lib/store";
import { PATH_TOUR, SPIRE_TOUR, markTourDone, type TourStep } from "@/lib/tour";

/** Отступ прожектора от краёв элемента-якоря. */
const SPOT_PAD = 6;
/** Зазор между прожектором и карточкой. */
const CARD_GAP = 12;
const CARD_MAX_W = 340;
/** Оценка высоты карточки до первого замера (докорректируется по ref). */
const CARD_EST_H = 190;
/** Прожектор крупнее этой доли вьюпорта → карточку рисуем по центру. */
const SPOT_FULLSCREEN = 0.75;

type SpotRect = { left: number; top: number; width: number; height: number };

function rectsEqual(a: SpotRect | null, b: SpotRect | null): boolean {
  if (!a || !b) return a === b;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

/**
 * Спотлайт-тур: затемняющий оверлей с «прожектором»-вырезом вокруг живого
 * элемента (box-shadow-приём) + liquid-glass карточка с шагами.
 *
 *  - сценарий выбирается по ВИДУ (profile.viewMode): Тропа → PATH_TOUR,
 *    Шпиль → SPIRE_TOUR; массив замораживается на время активного тура;
 *  - якоря ищутся по [data-tour="…"]; отсутствующий/невидимый якорь
 *    (нулевой размер, целиком вне вьюпорта) молча пропускается;
 *  - anchor === null → карточка по центру (интро/финал); полноэкранный
 *    прожектор (например spire-canvas) тоже центрирует карточку;
 *  - пере-замер на resize/scroll и раз в 500мс (3D-HUD может двигаться);
 *  - Tab циклирует фокус внутри карточки; Esc = пропустить;
 *  - завершение/пропуск → markTourDone().
 */
export const TourOverlay = () => {
  const tourActive = useApp((s) => s.tourActive);
  const setTourActive = useApp((s) => s.setTourActive);
  const viewMode = useApp((s) => s.profile.viewMode);
  const reduce = useReducedMotion();

  // сценарий по виду; на время активного тура — заморожен (смена
  // viewMode/брейкпоинта мид-тур не подменит шаги под текущим idx)
  const liveSteps = viewMode === "path" ? PATH_TOUR : SPIRE_TOUR;
  const frozenRef = useRef<TourStep[] | null>(null);
  if (tourActive && frozenRef.current === null) frozenRef.current = liveSteps;
  if (!tourActive && frozenRef.current !== null) frozenRef.current = null;
  const steps = frozenRef.current ?? liveSteps;

  // портал монтируется только на клиенте (SSR-безопасно)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<SpotRect | null>(null);
  const [cardH, setCardH] = useState(CARD_EST_H);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // новый запуск тура — всегда с первого шага
  useEffect(() => {
    if (tourActive) setIdx(0);
  }, [tourActive]);

  const finish = useCallback(() => {
    markTourDone();
    setTourActive(false);
  }, [setTourActive]);

  // следующий индекс считается синхронно от текущего idx (не в updater'е —
  // StrictMode двоит updater, а side effect вроде finish() там запрещён).
  // Повторный вызов с тем же idx идемпотентен.
  const advance = useCallback(() => {
    if (idx >= steps.length - 1) finish();
    else setIdx(idx + 1);
  }, [idx, steps.length, finish]);

  const step = steps[Math.min(idx, steps.length - 1)];

  // замер якоря + авто-skip шагов, чей якорь отсутствует или невидим
  useLayoutEffect(() => {
    if (!tourActive || !mounted) return;
    if (!step || step.anchor === null) {
      setRect(null);
      return;
    }

    let last: SpotRect | null = null;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`);
      if (!el) {
        advance(); // якорь пропал/не существует — молча дальше
        return;
      }
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // display:none (нулевой rect) или уехал за экран (translateX(-110vw)
      // у спрятанного таб-бара) — прожектор светил бы в пустоту
      if (r.width < 2 || r.height < 2 || r.right < 0 || r.left > vw || r.bottom < 0 || r.top > vh) {
        advance();
        return;
      }
      const next: SpotRect = {
        left: r.left - SPOT_PAD,
        top: r.top - SPOT_PAD,
        width: r.width + SPOT_PAD * 2,
        height: r.height + SPOT_PAD * 2,
      };
      if (!rectsEqual(last, next)) {
        last = next;
        setRect(next);
      }
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const t = setInterval(measure, 500); // 3D-HUD может двигаться сам по себе
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      clearInterval(t);
    };
  }, [tourActive, mounted, step, advance]);

  // фактическая высота карточки (меняется от шага к шагу) — для клампа top
  useLayoutEffect(() => {
    if (!tourActive) return;
    const h = cardRef.current?.offsetHeight;
    if (h && Math.abs(h - cardH) > 1) setCardH(h);
  });

  // Esc = пропустить
  useEffect(() => {
    if (!tourActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        finish();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [tourActive, finish]);

  // фокус на «Дальше» при каждой смене шага
  useEffect(() => {
    if (!tourActive) return;
    const t = setTimeout(() => nextBtnRef.current?.focus({ preventScroll: true }), 50);
    return () => clearTimeout(t);
  }, [tourActive, idx]);

  // focus-trap: Tab/Shift+Tab циклируют по фокусабельным внутри карточки
  // (иначе фокус уходит сквозь тур на фоновые кнопки) — образец modal.tsx
  const onTrapKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !cardRef.current) return;
    const focusables = cardRef.current.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!cardRef.current.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!mounted) return null;

  const isLast = idx >= steps.length - 1;
  const spotVisible = !!step && step.anchor !== null && rect !== null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(CARD_MAX_W, vw - 24);

  // доля вьюпорта под прожектором: полноэкранный якорь (spire-canvas —
  // fixed inset-0) иначе выталкивал карточку за нижний край экрана
  let spotCoverage = 0;
  if (spotVisible && rect) {
    const visW = Math.max(0, Math.min(rect.left + rect.width, vw) - Math.max(rect.left, 0));
    const visH = Math.max(0, Math.min(rect.top + rect.height, vh) - Math.max(rect.top, 0));
    spotCoverage = (visW * visH) / (vw * vh);
  }
  const cardCentered = !spotVisible || spotCoverage > SPOT_FULLSCREEN;

  // карточка: сверху или снизу от прожектора — где больше места;
  // итоговый top в любом случае клампится в пределы вьюпорта
  let cardPos: React.CSSProperties = {};
  if (!cardCentered && rect) {
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - cardW / 2, 12),
      Math.max(vw - cardW - 12, 12)
    );
    const below = vh - (rect.top + rect.height) >= rect.top;
    const rawTop = below ? rect.top + rect.height + CARD_GAP : rect.top - CARD_GAP - cardH;
    const top = Math.min(Math.max(rawTop, 8), Math.max(vh - cardH - 8, 8));
    cardPos = { left, top };
  }

  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 28 };

  const card = step && (
    <motion.div
      key={idx}
      ref={cardRef}
      className="liquid-glass"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring}
      style={{
        // .liquid-glass ставит position:relative — перебиваем инлайном
        position: cardCentered ? "relative" : "absolute",
        width: cardW,
        maxWidth: "calc(100vw - 24px)",
        borderRadius: 18,
        padding: "16px 18px 14px",
        pointerEvents: "auto",
        ...cardPos,
      }}
    >
      <h2
        className="font-serif"
        style={{
          margin: 0,
          fontSize: 18,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          color: "rgb(var(--hi))",
        }}
      >
        {step.title}
      </h2>
      <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "rgb(var(--mid))" }}>
        {step.text}
      </p>

      {/* прогресс-точки */}
      <div aria-hidden="true" style={{ display: "flex", gap: 6, margin: "14px 0 2px" }}>
        {steps.map((_, i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 99,
              background: i === idx ? "rgb(var(--accent))" : "rgb(var(--glass-hi) / 0.28)",
              transition: "background-color 0.25s",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
        <button
          onClick={finish}
          style={{
            minHeight: 44,
            padding: "0 10px",
            marginLeft: -10,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "rgb(var(--lo))",
          }}
        >
          Пропустить
        </button>
        <button
          ref={nextBtnRef}
          onClick={isLast ? finish : advance}
          className="glossy-btn"
          style={{
            minHeight: 44,
            padding: "0 22px",
            border: "none",
            borderRadius: 14,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {isLast ? "Понятно!" : "Дальше"}
        </button>
      </div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      {tourActive && step && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={step.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
          // клики по фону глушатся самим оверлеем (он накрывает всё)
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={onTrapKeyDown}
          style={{ position: "fixed", inset: 0, zIndex: 80 }}
        >
          {spotVisible ? (
            /* прожектор: скрим рисует box-shadow выреза */
            <motion.div
              aria-hidden="true"
              initial={false}
              animate={rect ?? undefined}
              transition={spring}
              style={{
                position: "absolute",
                borderRadius: 14,
                pointerEvents: "none",
                boxShadow:
                  "0 0 0 9999px rgb(var(--scrim) / 0.72), inset 0 0 0 1.5px rgb(var(--accent) / 0.55)",
              }}
            />
          ) : (
            /* интро/финал: сплошной скрим */
            <div
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, background: "rgb(var(--scrim) / 0.72)" }}
            />
          )}
          {cardCentered ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                padding: 16,
                pointerEvents: "none",
              }}
            >
              {card}
            </div>
          ) : (
            card
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default TourOverlay;
