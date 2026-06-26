"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Zap, Lock, Check, Crown, BookOpen, Star } from "lucide-react";
import { useApp } from "@/lib/store";
import { computeScore, bandColor } from "@/lib/score-model";
import { floorState, STATE_META } from "@/lib/floor-state";
import { overallReadiness, isLocked, unlockGap } from "@/lib/floor-build";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useToast } from "./Toast";
import type { Floor } from "@/data/types";

/** Хост мобильных шитов: «Прогресс» и «Выбор урока». */
export function MobileSheets() {
  const sheet = useApp((s) => s.sheet);
  const setSheet = useApp((s) => s.setSheet);

  return (
    <>
      <BottomSheet open={sheet === "progress"} onClose={() => setSheet(null)} label="Прогресс">
        <ProgressContent />
      </BottomSheet>
      <BottomSheet open={sheet === "lessonPicker"} onClose={() => setSheet(null)} label="Выбор урока">
        <LessonPickerContent />
      </BottomSheet>
    </>
  );
}

/* ——— Прогресс готовности (та же информация, что в десктоп-консоли) ——— */
function ProgressContent() {
  const subject = useApp((s) => s.subject());
  const profile = useApp((s) => s.profile);
  const selectFloor = useApp((s) => s.selectFloor);
  const setSheet = useApp((s) => s.setSheet);

  const sc = computeScore(subject);
  const col = bandColor(sc.half);
  const ready = overallReadiness(subject.floors);
  const weak = subject.floors
    .slice()
    .sort((a, b) => a.prog + a.stab - (b.prog + b.stab))
    .filter((f) => floorState(f) !== "solid")
    .slice(0, 3);

  return (
    <div>
      <div className="mb-1 font-hand text-[18px] leading-none text-mid">
        С возвращением, <span className="text-accent">{profile.name}</span>!
      </div>
      <h2 className="m-0 mb-3 text-[15px] font-semibold text-hi">
        Готовность · <em className="font-serif not-italic text-accent">{subject.name}</em>
      </h2>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.02)] p-3">
          <div className="text-[24px] font-bold leading-none text-hi">
            {sc.solid}<small className="ml-0.5 text-[14px] font-normal text-lo">/{sc.total}</small>
          </div>
          <div className="mt-1 hud-label text-[8.5px] text-lo">Высота · этажи</div>
        </div>
        <div className="rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.02)] p-3">
          <div
            className="text-[24px] font-bold leading-none"
            style={{ color: sc.aS < 55 ? "#FF5C6E" : sc.aS >= 72 ? "#5BE3B0" : "rgb(var(--hi))" }}
          >
            {sc.aS}<small className="ml-0.5 text-[14px] font-normal opacity-60">%</small>
          </div>
          <div className="mt-1 hud-label text-[8.5px] text-lo">Стабильность</div>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.02)] p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="hud-label text-[8.5px] text-lo">Готовность к ЕГЭ</span>
          <b className="font-mono text-[14px] text-accent">{ready}%</b>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--glass-hi)/0.08)]">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent" animate={{ width: `${ready}%` }} />
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.02)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="hud-label text-[9px] text-lo">Прогноз балла</span>
          <span className="font-mono text-[15px] font-bold" style={{ color: col }}>{sc.min}–{sc.max}</span>
        </div>
        <div className="relative h-2 rounded-full bg-[rgb(var(--glass-hi)/0.06)]">
          <div className="absolute top-0 h-full rounded-full" style={{ left: `${sc.min}%`, width: `${Math.max(2, sc.max - sc.min)}%`, background: col }} />
          <div className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded bg-hi" style={{ left: `${subject.goal}%` }} />
        </div>
      </div>

      <div className="hud-label mb-2 text-[9px] text-lo">Дрожащие зоны — нажми, чтобы укрепить</div>
      <div className="flex flex-wrap gap-1.5">
        {weak.length ? (
          weak.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setSheet(null);
                selectFloor(f.id, { zoom: profile.viewMode === "spire" });
              }}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-[rgb(var(--glass-hi)/0.03)] px-3 py-2 text-[12px] text-mid"
            >
              <Zap size={12} className="text-danger" /> {f.name}
            </button>
          ))
        ) : (
          <span className="text-[12px] text-lo">Все зоны устойчивы 🎯</span>
        )}
      </div>
    </div>
  );
}

/* ——— Выбор урока: список тем со статусом и гейтингом ——— */
function nodeIcon(f: Floor, st: ReturnType<typeof floorState>, locked: boolean) {
  if (locked) return Lock;
  if (f.boss) return Crown;
  if (st === "solid") return Check;
  if (st === "ghost" || st === "forming") return BookOpen;
  return Star;
}

function LessonPickerContent() {
  const subject = useApp((s) => s.subject());
  const openModal = useApp((s) => s.openModal);
  const setSheet = useApp((s) => s.setSheet);
  const toast = useToast();
  const floors = subject.floors;

  return (
    <div>
      <h2 className="m-0 mb-3 text-[15px] font-semibold text-hi">Выбери тему</h2>
      <div className="space-y-2">
        {floors.map((f, i) => {
          const st = floorState(f);
          const locked = isLocked(floors, i);
          const Icon = nodeIcon(f, st, locked);
          const meta = STATE_META[st];
          return (
            <button
              key={f.id}
              onClick={() => {
                if (locked) {
                  toast(`🔒 «${f.name}» закрыт. Укрепи нижние темы ещё на <b>~${unlockGap(floors, i)}%</b>.`);
                  return;
                }
                setSheet(null);
                openModal("lesson", f.id);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-[rgb(var(--glass-hi)/0.02)] p-3 text-left"
              style={{ opacity: locked ? 0.6 : 1 }}
            >
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                style={{
                  background: locked ? "rgb(var(--glass-hi)/0.06)" : `${f.hue}22`,
                  border: `2px solid ${locked ? "rgb(var(--line)/0.4)" : f.hue + "88"}`,
                  color: locked ? "rgb(var(--lo))" : f.hue,
                }}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-hi">{f.name}</span>
                  {f.boss && <span className="font-mono text-[9px] text-accent">корона</span>}
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color: locked ? "rgb(var(--lo))" : meta.color }}>
                  {locked ? `закрыт · +${unlockGap(floors, i)}% до открытия` : `${meta.label} · освоено ${f.prog}%`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
