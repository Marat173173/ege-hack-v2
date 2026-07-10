"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GraduationCap, X } from "lucide-react";
import { useApp } from "@/lib/store";

/**
 * Превью «входящего сообщения» от ИИ-репетитора — карточка сверху экрана,
 * как push-уведомление мессенджера. Тап открывает чат (кнопки «Давай/Нет»
 * покажет сам чат, статус здесь НЕ резолвим); крестик просто скрывает —
 * статус остаётся pending, и Page предложит снова.
 * Показом рулит Page (nudgeVisible), сюда — только рендер.
 */
export function TutorNudgeToast() {
  const nudge = useApp((s) => s.tutorNudge);
  const visible = useApp((s) => s.nudgeVisible);
  const hideNudge = useApp((s) => s.hideNudge);
  const setScreen = useApp((s) => s.setScreen);
  const reduce = useReducedMotion();

  const show = visible && nudge?.status === "pending";

  // авто-скрытие: «сообщение» не должно висеть вечно
  React.useEffect(() => {
    if (!show) return;
    const t = setTimeout(hideNudge, 12000);
    return () => clearTimeout(t);
  }, [show, hideNudge]);

  function open() {
    hideNudge();
    setScreen("chat");
  }

  return (
    <AnimatePresence>
      {show && nudge && (
        <motion.div
          key={nudge.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -120 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -120 }}
          transition={
            reduce ? { duration: 0.2 } : { type: "spring", stiffness: 340, damping: 28 }
          }
          // z-[72] — выше CelebrationOverlay (69) и тостов (70)
          className="fixed inset-x-0 top-0 z-[72] flex justify-center px-3"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          aria-live="polite"
        >
          <div
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }}
            className="liquid-glass focus-ring flex w-full max-w-[440px] cursor-pointer items-start gap-3 rounded-2xl p-3.5"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15">
              <GraduationCap size={18} className="text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-hi">ИИ-репетитор</div>
              <p className="m-0 mt-0.5 text-[13px] leading-snug text-mid">
                Давай разберём твой тест по „{nudge.floorName}“ — ты ответил{" "}
                {nudge.correct}/{nudge.total}. Пройдёмся подробнее?
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                hideNudge();
              }}
              aria-label="Скрыть сообщение"
              className="focus-ring -mr-1.5 -mt-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lo transition-colors hover:text-hi"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
