"use client";

import React from "react";
import { ScanLine, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { CarouselDeck, type DeckCard } from "@/components/ui/carousel-deck";
import type { Floor } from "@/data/types";

/**
 * CritiqueModal — разбор второй части по критериям ФИПИ как модалка-карусель.
 * Каждый критерий = карточка стека (формат шаблона). Карточки с потерей балла
 * подсвечены красным, полные — мятным. Кнопка «учесть разбор» докручивает этаж.
 */
export function CritiqueModal({
  floor,
  open,
  onClose,
  onApply,
}: {
  floor: Floor | null;
  open: boolean;
  onClose: () => void;
  onApply: (id: string) => void;
}) {
  if (!floor || !floor.crit) return null;

  // первая карточка — само задание и ответ, далее по критериям
  const taskCard: DeckCard = {
    badge: "Задание",
    title: "Условие и твой ответ",
    body: floor.task || "",
    meta: floor.answer ? "Ответ: " + floor.answer : undefined,
    accent: floor.hue,
  };

  const critCards: DeckCard[] = floor.crit.map((c) => {
    const full = c.have >= c.max;
    return {
      badge: c.code,
      title: c.name,
      body: c.tip,
      meta: `${c.have}/${c.max}${c.gain ? "  ·  " + c.gain : ""}`,
      accent: full ? "#5BE3B0" : "#FF5C6E",
    };
  });

  const cards = [taskCard, ...critCards];

  return (
    <Modal
      open={open}
      onClose={onClose}
      label="LLM · критерии ФИПИ"
      title={
        <span className="ct-title">
          <ScanLine size={18} style={{ color: floor.hue }} /> Разбор: {floor.name}
        </span>
      }
      maxWidth="46rem"
    >
      <div
        className="ct-sum"
        dangerouslySetInnerHTML={{ __html: floor.sum || "" }}
      />

      <CarouselDeck
        cards={cards}
        colors={{ arrowHoverBackground: floor.hue }}
      />

      <button
        className="ct-apply"
        onClick={() => {
          onApply(floor.id);
          onClose();
        }}
        style={{ ["--c" as string]: floor.hue }}
      >
        <Check size={16} />
        Учесть разбор и доработать
      </button>

      <style jsx>{`
        .ct-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .ct-sum {
          margin: 2px 0 16px;
          padding: 12px 14px;
          border: 1px solid rgb(var(--line) / var(--line-a));
          border-radius: 12px;
          background: rgb(var(--hi) / 0.035);
          font-size: 14px;
          line-height: 1.55;
          color: rgb(var(--mid));
        }
        .ct-sum :global(b) {
          color: rgb(var(--hi));
        }
        .ct-apply {
          /* sticky-футер: «учесть разбор» всегда виден, без скролла карусели */
          position: sticky;
          bottom: 0;
          z-index: 3;
          margin-top: 18px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 52px;
          padding: 13px;
          border: 0;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          color: #0a0e18;
          cursor: pointer;
          background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 70%, #000));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4),
            0 10px 26px -12px var(--c), 0 -16px 22px -10px rgb(var(--bg-1));
        }
      `}</style>
    </Modal>
  );
}
