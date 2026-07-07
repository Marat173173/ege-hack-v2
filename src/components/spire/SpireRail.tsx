"use client";

import * as React from "react";
import { useApp } from "@/lib/store";
import { floorState, STATE_META } from "@/lib/floor-state";
import { lockMap } from "@/lib/floor-build";

/**
 * SpireRail — «панель лифта»: мини-карта всей башни у правого края.
 *
 * Чистый DOM-оверлей (0 влияния на FPS сцены): тик на каждый этаж полного
 * кодификатора, цвет = состояние (монолит/нестабильно/формируется/призрак/
 * закрыт). Тап по рейлу → полёт камеры к этажу (selectFloor + zoom).
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

  if (mode === "parent" || focusId) return null;

  // тап по рейлу: Y → индекс этажа (снизу вверх, как растёт башня)
  function pick(e: React.MouseEvent) {
    const el = railRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const frac = 1 - (e.clientY - r.top) / r.height; // низ = этаж 0
    const idx = Math.max(0, Math.min(floors.length - 1, Math.round(frac * (floors.length - 1))));
    if (locks[idx]) return; // закрытые не открываем — их поднимет гейтинг
    selectFloor(floors[idx].id, { zoom: true });
  }

  return (
    <div
      ref={railRef}
      role="slider"
      aria-label={`Карта башни: ${floors.length} тем, тапни для перехода`}
      aria-valuemin={1}
      aria-valuemax={floors.length}
      aria-valuenow={selectedId ? floors.findIndex((f) => f.id === selectedId) + 1 : undefined}
      tabIndex={0}
      onClick={pick}
      className="focus-ring fixed right-1.5 top-1/2 z-[4] flex h-[38vh] -translate-y-1/2 cursor-pointer flex-col-reverse justify-between rounded-full px-1.5 py-2 md:right-3"
      style={{ background: "rgb(var(--glass-tint) / 0.35)", backdropFilter: "blur(8px)" }}
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
