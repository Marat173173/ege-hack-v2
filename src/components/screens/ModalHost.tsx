"use client";

import React from "react";
import { useApp } from "@/lib/store";
import { XP } from "@/lib/gamification";
import { LessonModal } from "./LessonModal";
import { CritiqueModal } from "./CritiqueModal";
import { useToast } from "./Toast";

/**
 * Единая точка монтирования модалок поверх Шпиля. Берёт состояние из стора
 * (modal: { kind, floorId }) и показывает нужное окно. Действия внутри окон
 * двигают прогресс этажа и показывают тост.
 */
export function ModalHost() {
  const modal = useApp((s) => s.modal);
  const closeModal = useApp((s) => s.closeModal);
  const floorById = useApp((s) => s.floorById);
  const openSolve = useApp((s) => s.openSolve);
  const bump = useApp((s) => s.bump);
  const gainXp = useApp((s) => s.gainXp);
  const toast = useToast();

  const floor = modal ? floorById(modal.floorId) ?? null : null;

  return (
    <>
      <LessonModal
        floor={floor}
        open={modal?.kind === "lesson"}
        onClose={closeModal}
        onTrain={(id) => {
          closeModal();
          openSolve(id);
        }}
      />
      <CritiqueModal
        floor={floor}
        open={modal?.kind === "critique"}
        onClose={closeModal}
        onApply={(id) => {
          bump(id, 6, 26);
          gainXp(XP.critiqueApply);
          const f = floorById(id);
          toast(
            `Разбор учтён. Этаж «${f?.name ?? ""}» перестаёт дрожать — диапазон сузился.`
          );
        }}
      />
    </>
  );
}
