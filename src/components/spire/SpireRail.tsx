"use client";

import * as React from "react";
import { useApp } from "@/lib/store";
import { floorState, STATE_META } from "@/lib/floor-state";
import { lockMap } from "@/lib/floor-build";
import { spireCameraBus } from "./spire-camera-bus";

/** Порог (мс) удержания без движения, после которого включается зум-ин. */
const HOLD_MS = 350;
/** Вертикальный паддинг рейла (py-2): тики лежат в КОНТЕНТ-боксе, и маппинг
 *  Y→индекс обязан его вычитать — иначе крайние тики мапятся на соседей. */
const RAIL_PAD = 8;
/** Люфт (px) по вертикали, после которого жест считается свайпом. */
const SWIPE_SLOP = 6;

/**
 * SpireRail — «панель лифта»: мини-карта всей башни у правого края.
 *
 * Чистый DOM-оверлей (0 влияния на FPS сцены): тик на каждый этаж полного
 * кодификатора, цвет = состояние (монолит/нестабильно/формируется/призрак/
 * закрыт). Жесты (через spireCameraBus, без ре-рендеров):
 *  - тап → полёт камеры к этажу (selectFloor + zoom), как раньше;
 *  - вертикальный свайп → панорама камеры по высоте башни;
 *  - удержание (350мс без движения) → плавный зум-ин, пока палец на рейле.
 * Отвечает на «где я / сколько всего / где дрожит» одним взглядом.
 * Скрывается в фокус-режиме и у родителя (не конкурирует с шитом).
 */
export function SpireRail() {
  const subject = useApp((s) => s.subject());
  const selectFloor = useApp((s) => s.selectFloor);
  const focusId = useApp((s) => s.focusId);
  const selectedId = useApp((s) => s.selectedId);
  const mode = useApp((s) => s.mode);

  const floors = subject.floors;
  const locks = React.useMemo(() => lockMap(floors), [floors]);
  const railRef = React.useRef<HTMLDivElement>(null);

  // «магнифер»: при наведении/касании рейл растёт ×1.7 — выбирать из 15+
  // модулей удобнее (фидбек владельца). Рост влево от правого края.
  const [engaged, setEngaged] = React.useState(false);

  // состояние жеста — в ref (60fps-события не должны ре-рендерить рейл)
  const gesture = React.useRef<{
    active: boolean;
    startX: number;
    startY: number;
    moved: boolean;
    zoomed: boolean;
    timer: ReturnType<typeof setTimeout> | null;
    /** Геометрия рейла В МОМЕНТ касания: магнифер растит рейл сразу после
     *  pointerdown, и живой rect на pointerup мапил бы тап на другой этаж. */
    rect: { top: number; height: number } | null;
  }>({ active: false, startX: 0, startY: 0, moved: false, zoomed: false, timer: null, rect: null });

  // страховка: анмаунт (уход в фокус/родителя) посреди жеста не должен
  // оставить камеру в вечном зум-ине
  React.useEffect(() => {
    const g = gesture.current;
    return () => {
      if (g.timer) clearTimeout(g.timer);
      spireCameraBus.zooming = false;
    };
  }, []);

  if (mode === "parent" || focusId) return null;

  // тап по рейлу: Y → индекс этажа (снизу вверх, как растёт башня).
  // Геометрия — зафиксированная на pointerdown (см. gesture.rect).
  function pickAt(clientY: number) {
    const r = gesture.current.rect;
    if (!r) return;
    const top = r.top + RAIL_PAD;
    const h = Math.max(1, r.height - RAIL_PAD * 2);
    const frac = 1 - (clientY - top) / h; // низ = этаж 0
    const idx = Math.max(0, Math.min(floors.length - 1, Math.round(frac * (floors.length - 1))));
    if (locks[idx]) return; // закрытые не открываем — их поднимет гейтинг
    selectFloor(floors[idx].id, { zoom: true });
  }

  function onPointerDown(e: React.PointerEvent) {
    const g = gesture.current;
    // rect ДО магнифер-скейла: setEngaged ниже растянет рейл, но палец
    // целился по текущей геометрии — весь жест мапим по ней
    const r = railRef.current?.getBoundingClientRect();
    g.rect = r ? { top: r.top, height: r.height } : null;
    setEngaged(true); // тач: растим рейл на время жеста
    railRef.current?.setPointerCapture(e.pointerId);
    g.active = true;
    g.startX = e.clientX;
    g.startY = e.clientY;
    g.moved = false;
    g.zoomed = false;
    if (g.timer) clearTimeout(g.timer);
    g.timer = setTimeout(() => {
      g.timer = null;
      if (!g.moved) {
        g.zoomed = true;
        spireCameraBus.zooming = true;
      }
    }, HOLD_MS);
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g.active || g.zoomed) return; // удержание-зум перебивает свайп
    // горизонталь не принадлежит вертикальному рейлу — отменяем жест целиком
    // (иначе горизонт-драг завершался бы ложным тапом → «полёт камеры»)
    if (!g.moved && Math.abs(e.clientX - g.startX) > SWIPE_SLOP + 4 &&
        Math.abs(e.clientX - g.startX) > Math.abs(e.clientY - g.startY)) {
      g.active = false;
      if (g.timer) { clearTimeout(g.timer); g.timer = null; }
      spireCameraBus.zooming = false;
      setEngaged(false);
      return;
    }
    if (!g.moved && Math.abs(e.clientY - g.startY) > SWIPE_SLOP) {
      g.moved = true;
      if (g.timer) {
        clearTimeout(g.timer);
        g.timer = null;
      }
    }
    if (g.moved) {
      const r = g.rect;
      if (!r) return;
      // вертикальный свайп = панорама по зафиксированной геометрии
      const frac = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
      spireCameraBus.panFrac?.(frac);
    }
  }

  function onPointerEnd(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g.active) return;
    g.active = false;
    if (g.timer) {
      clearTimeout(g.timer);
      g.timer = null;
    }
    spireCameraBus.zooming = false;
    const wasZoom = g.zoomed;
    g.zoomed = false;
    // чистый тап (не свайп, не зум-удержание) — переход к этажу, как раньше
    if (e.type === "pointerup" && !g.moved && !wasZoom) pickAt(e.clientY);
    g.moved = false;
    setEngaged(false);
  }

  return (
    <div
      ref={railRef}
      role="slider"
      aria-label={`Карта башни: ${floors.length} тем; тап — переход к этажу, свайп — панорама, удержание — зум`}
      aria-valuemin={1}
      aria-valuemax={floors.length}
      aria-valuenow={selectedId ? floors.findIndex((f) => f.id === selectedId) + 1 : undefined}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerEnter={() => setEngaged(true)}
      onPointerLeave={() => {
        // не схлопывать посреди активного жеста (pointer capture держит события)
        if (!gesture.current.active) setEngaged(false);
      }}
      className="focus-ring fixed right-1.5 top-1/2 z-[4] flex h-[38vh] cursor-pointer flex-col-reverse justify-between rounded-full px-1.5 py-2 md:right-3"
      style={{
        background: "rgb(var(--glass-tint) / 0.35)",
        backdropFilter: "blur(8px)",
        touchAction: "none", // жест наш: браузерный скролл/зум не перехватывает
        // -translate-y-1/2 задаём инлайном: transform с magnifier-scale должен
        // жить в одном свойстве (tailwind-класс перекрывался бы)
        transform: `translateY(-50%) scale(${engaged ? 1.7 : 1})`,
        transformOrigin: "100% 50%",
        transition: "transform 0.18s ease-out",
      }}
    >
      {floors.map((f, i) => {
        const st = floorState(f);
        const locked = locks[i];
        const on = f.id === selectedId;
        const color = locked
          ? "rgb(var(--line) / 0.5)"
          : st === "solid" || st === "unstable"
          ? STATE_META[st].color
          : st === "forming"
          ? "rgb(var(--accent))"
          : "rgb(var(--mid) / 0.55)";
        return (
          <span
            key={f.id}
            aria-hidden="true"
            className="rounded-full"
            style={{
              width: on ? 10 : 5,
              height: 2.5,
              background: color,
              opacity: locked ? 0.6 : 1,
              transition: "width .2s, background .2s",
            }}
          />
        );
      })}
    </div>
  );
}
