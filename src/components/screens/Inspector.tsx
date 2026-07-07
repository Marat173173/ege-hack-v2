"use client";

import * as React from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { X, Dumbbell, Timer, ScanLine, Sparkles, GraduationCap, FlaskConical } from "lucide-react";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { TutorFAB } from "@/components/tutor/TutorFAB";
import { useApp } from "@/lib/store";
import { useIsMobile } from "@/lib/use-media";
import { floorState, STATE_META } from "@/lib/floor-state";
import { computeScore } from "@/lib/score-model";
import { FipiSubtopics } from "@/components/spire/FipiSubtopics";

function StateChip({ state }: { state: ReturnType<typeof floorState> }) {
  const m = STATE_META[state];
  return (
    <span className="state-chip" style={{ color: m.color, borderColor: m.color + "55" }}>
      <i style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

function Bar({ label, val, color }: { label: string; val: number; color: string }) {
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-center justify-between text-[11px] text-mid">
        <span>{label}</span>
        <b className="text-hi">{Math.round(val)}%</b>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${val}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

function ParentReport() {
  const subject = useApp((s) => s.subject());
  const sc = computeScore(subject);
  const weak = subject.floors
    .slice()
    .sort((a, b) => a.prog + a.stab - (b.prog + b.stab))
    .filter((f) => floorState(f) !== "solid")
    .slice(0, 2)
    .map((f) => f.name);

  const cards: [string, React.ReactNode][] = [
    ["Уровень готовности", <>{sc.solid} из {sc.total} тем освоено<br /><small className="text-lo">прогресс заметный, движется по плану</small></>],
    ["Надёжность прогноза", <>{sc.aS}%<br /><small className="text-lo">{sc.aS < 60 ? "результат пока неустойчив — есть риск просесть на экзамене" : "результат стабильный, на него можно опираться"}</small></>],
    ["Ожидаемый балл", <>{sc.min}–{sc.max}<br /><small className="text-lo">цель — {subject.goal}</small></>],
    ["Над чем работаем", <small className="text-lo">{weak.length ? weak.join(", ") : "слабых тем нет"}</small>],
    ["Занятия", <>Серия {subject.streak} дней<br /><small className="text-lo">последнее занятие — сегодня</small></>],
  ];

  return (
    <div>
      <div className="mb-3">
        <span className="hud-label text-[11px] text-mid">отчёт для родителя</span>
        <h3 className="m-0 mt-1 font-serif text-xl text-hi">{subject.name}</h3>
      </div>
      <div className="space-y-2">
        {cards.map(([k, v], i) => (
          <div key={i} className="rounded-xl border border-line bg-white/[0.02] p-3">
            <div className="hud-label text-[11px] text-mid">{k}</div>
            <div className="mt-1 text-[15px] font-medium text-hi">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Inspector() {
  const mode = useApp((s) => s.mode);
  const selectedId = useApp((s) => s.selectedId);
  const floor = useApp((s) => s.floorById(s.selectedId));
  const closeInspector = useApp((s) => s.closeInspector);
  const openSolve = useApp((s) => s.openSolve);
  const openModal = useApp((s) => s.openModal);
  const bump = useApp((s) => s.bump);
  const isMobile = useIsMobile();
  const dragControls = useDragControls();

  const visible = mode === "parent" || !!selectedId;

  const onSheetDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) closeInspector();
  };

  const content =
    mode === "parent" ? (
      <ParentReport />
    ) : floor ? (
      <>
                <div className="relative mb-3">
                  <button
                    onClick={closeInspector}
                    aria-label="Закрыть"
                    className="focus-ring absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-lg border border-line text-mid transition-colors hover:text-hi"
                  >
                    <X size={18} />
                  </button>
                  <span className="hud-label text-[11px] text-mid">{floor.tag}</span>
                  <h3 className="m-0 mb-2 mt-1 pr-12 font-serif text-xl leading-tight text-hi">
                    {floor.name}
                  </h3>
                  <StateChip state={floorState(floor)} />
                </div>

                <div className="mb-3 mt-4">
                  <Bar label="Освоено · высота этажа" val={floor.prog} color="rgb(var(--accent))" />
                  <Bar
                    label="Стабильность · надёжность"
                    val={floor.stab}
                    color={floor.stab < 65 ? "#FF5C6E" : "#5BE3B0"}
                  />
                </div>

                <div className="space-y-2">
                  {/* Детальный урок — открывает модалку-карусель */}
                  <button
                    onClick={() => openModal("lesson", floor.id)}
                    className="glossy-btn flex w-full items-center justify-between rounded-xl px-4 py-3 text-left"
                  >
                    <span className="flex items-center gap-2 text-[13px] font-bold">
                      <GraduationCap size={16} /> Детальный урок
                    </span>
                    <small className="font-mono text-[10px] opacity-70">карточки темы</small>
                  </button>

                  <button
                    onClick={() => openSolve(floor.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-left text-hi transition-colors hover:bg-white/[0.06]"
                  >
                    <span className="flex items-center gap-2 text-[13px] font-medium">
                      <Dumbbell size={16} /> Тренировать тему
                    </span>
                    <small className="font-mono text-[10px] text-lo">+ практика</small>
                  </button>

                  {floor.boss ? (
                    <button
                      onClick={() => openModal("critique", floor.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-left text-hi transition-colors hover:bg-white/[0.06]"
                    >
                      <span className="flex items-center gap-2 text-[13px] font-medium">
                        <ScanLine size={16} /> Разобрать развёрнутый ответ
                      </span>
                      <small className="font-mono text-[10px] text-lo">llm · фипи</small>
                    </button>
                  ) : (
                    <button
                      onClick={() => openSolve(floor.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-left text-hi transition-colors hover:bg-white/[0.06]"
                    >
                      <span className="flex items-center gap-2 text-[13px] font-medium">
                        <Timer size={16} /> Симуляция в формате экзамена
                      </span>
                      <small className="font-mono text-[10px] text-lo">таймер</small>
                    </button>
                  )}
                </div>

                {floor.boss && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/[0.06] p-2.5">
                    <Sparkles size={15} className="mt-0.5 shrink-0 text-accent" />
                    <p className="m-0 text-[11px] leading-snug text-mid">
                      Это «корона» — вторая часть. Самый большой запас баллов. Открой ИИ-разбор по
                      критериям ФИПИ.
                    </p>
                  </div>
                )}

                {/* ⚠️ ВРЕМЕННО (тест Шпиля): мгновенно засчитывает модуль
                    пройденным (prog/stab → 100, этаж твердеет, гейтинг
                    открывает следующие). Удалить перед продом. */}
                <button
                  onClick={() => {
                    bump(floor.id, 100, 100);
                    closeInspector();
                  }}
                  className="focus-ring mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-warn/50 bg-warn/[0.06] px-4 py-3 text-[12.5px] font-semibold text-warn transition-colors hover:bg-warn/[0.12]"
                >
                  <FlaskConical size={15} /> Прошёл модуль (тест)
                </button>

                {/* Подтемы кодификатора ФИПИ 2026 — открывают ИИ-репетитора по конкретной теме */}
                <FipiSubtopics floorId={floor.id} />
      </>
    ) : null;

  return (
    <AnimatePresence>
      {visible &&
        (isMobile ? (
          /* ——— МОБАЙЛ: bottom-sheet со скримом и свайпом вниз ——— */
          <motion.div
            key={mode === "parent" ? "parent" : selectedId}
            className="pointer-events-auto fixed inset-0 z-[55] flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.target === e.currentTarget && closeInspector()}
            style={{
              background: "rgb(var(--scrim) / 0.42)",
              // только мягкий расфокус (без brightness)
              backdropFilter: "blur(12px) saturate(120%)",
              WebkitBackdropFilter: "blur(12px) saturate(120%)",
            }}
          >
            <motion.div
              className="relative w-full"
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={onSheetDragEnd}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              {/* ИИ-репетитор — над окошком модуля, с фильтром открытой темы */}
              {mode !== "parent" && floor && <TutorFAB topic={floor.id} />}
              <div
                className="relative z-[1] overflow-hidden rounded-t-2xl border border-b-0 border-[rgb(var(--glass-hi)/var(--glass-border-a))]"
                style={{
                  // СПЛОШНОЙ фон без backdrop-filter — чёткая панель поверх скрима
                  background:
                    "linear-gradient(180deg, rgb(var(--glass-hi) / 0.06), transparent 40%), rgb(var(--bg-1))",
                  boxShadow: "0 -12px 40px -16px rgba(0,0,0,0.6)",
                }}
              >
                {/* тянуть/закрывать — только за рукоятку (иначе свайп ломает скролл) */}
                <div
                  className="pt-3"
                  style={{ touchAction: "none", cursor: "grab" }}
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <div
                    aria-hidden="true"
                    className="mx-auto h-1 w-10 rounded-full"
                    style={{ background: "rgb(var(--glass-hi) / 0.35)" }}
                  />
                </div>
                <div className="thin-scroll max-h-[78dvh] overflow-y-auto p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                  {content}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* ——— ДЕСКТОП/ПЛАНШЕТ: правый рейл ——— */
          <motion.div
            key={mode === "parent" ? "parent-d" : "d-" + selectedId}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
            className="pointer-events-auto fixed right-0 top-[88px] z-[6] h-[calc(100dvh-100px)] w-full max-w-[392px] px-3 pb-3 md:top-[96px] md:h-[calc(100dvh-112px)] md:px-4 md:pb-4"
          >
            <LiquidGlass sheen className="thin-scroll h-full overflow-y-auto rounded-2xl p-4 md:p-5">
              {content}
            </LiquidGlass>
          </motion.div>
        ))}
    </AnimatePresence>
  );
}
