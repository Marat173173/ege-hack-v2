"use client";

import React from "react";
import { Dumbbell, GraduationCap, BookText, ExternalLink, ListChecks, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { CarouselDeck, type DeckCard } from "@/components/ui/carousel-deck";
import { getHandbook } from "@/data/handbooks";
import type { Floor } from "@/data/types";

/** Фолбэк-карточки урока, если у темы нет своих lessons. */
function fallbackLessons(floor: Floor): DeckCard[] {
  return [
    {
      badge: "Что это",
      title: floor.name,
      body: `Тема «${floor.name}» (${floor.tag}). Здесь собрана теория, типичные ошибки и примеры из формата ЕГЭ. Освоение этажа поднимает Шпиль, стабильность — сужает диапазон прогноза.`,
      accent: floor.hue,
    },
    {
      badge: "Как оценивают",
      title: "Что приносит балл",
      body: "Эксперт смотрит на конкретные признаки ответа. Покажем, какие из них ты уже даёшь, а какие теряешь — и как закрыть пробел минимальными шагами.",
      accent: floor.hue,
    },
    {
      badge: "Следующий шаг",
      title: "Закрепить практикой",
      body: "Лучший способ укрепить этаж — прорешать несколько заданий этого типа с мгновенной проверкой. Жми «Тренировать тему».",
      accent: floor.hue,
    },
  ];
}

/** Справочник темы — авторская справка + ссылки на ФИПИ. */
function Handbook({
  floor,
  hb,
}: {
  floor: Floor;
  hb: ReturnType<typeof getHandbook>;
}) {
  if (!hb) {
    return (
      <div className="hb-empty">
        Справочник для темы «{floor.name}» готовится. Пока загляни в карточки урока
        и официальный банк ФИПИ.
        <a className="hb-link" href="https://ege.fipi.ru/bank/" target="_blank" rel="noreferrer">
          <ExternalLink size={13} /> Открытый банк ФИПИ
        </a>
      </div>
    );
  }
  return (
    <div className="hb">
      <p className="hb-summary">{hb.summary}</p>

      <div className="hb-sec">
        <div className="hb-h"><ListChecks size={14} /> Правила и формулы</div>
        <ul className="hb-list">
          {hb.rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="hb-sec">
        <div className="hb-h hb-warn"><AlertTriangle size={14} /> Частые ошибки</div>
        <ul className="hb-list">
          {hb.mistakes.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>

      <div className="hb-sec">
        <div className="hb-h"><BookText size={14} /> Источники</div>
        <div className="hb-links">
          {hb.links.map((l, i) => (
            <a key={i} className="hb-link" href={l.url} target="_blank" rel="noreferrer">
              <ExternalLink size={13} /> {l.label} <span className="hb-src">· {l.source}</span>
            </a>
          ))}
        </div>
      </div>

      <p className="hb-note">
        Справки написаны командой ЕГЭ-ХАК своими словами. Полные материалы — у
        первоисточника по ссылкам.
      </p>

      <style jsx>{`
        .hb { color: rgb(var(--mid)); }
        .hb-summary {
          margin: 2px 0 14px;
          font-size: 13.5px;
          line-height: 1.55;
          color: rgb(var(--hi));
        }
        .hb-sec {
          margin-bottom: 14px;
          border: 1px solid rgb(var(--line) / 0.4);
          border-radius: 12px;
          background: rgb(var(--glass-hi) / 0.02);
          padding: 12px 14px;
        }
        .hb-h {
          display: flex;
          align-items: center;
          gap: 7px;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgb(var(--accent));
          margin-bottom: 8px;
        }
        .hb-warn { color: #ffc65b; }
        .hb-list { margin: 0; padding-left: 18px; }
        .hb-list li {
          font-size: 13px;
          line-height: 1.5;
          color: rgb(var(--mid));
          margin-bottom: 5px;
        }
        .hb-links { display: flex; flex-direction: column; gap: 8px; }
        .hb-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          color: rgb(var(--accent));
          text-decoration: none;
        }
        .hb-link:hover { text-decoration: underline; }
        .hb-src { color: rgb(var(--lo)); }
        .hb-note {
          margin: 6px 0 0;
          font-size: 11px;
          line-height: 1.5;
          color: rgb(var(--lo));
        }
        .hb-empty {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 13px;
          line-height: 1.5;
          color: rgb(var(--mid));
          padding: 8px 0;
        }
      `}</style>
    </div>
  );
}

export function LessonModal({
  floor,
  open,
  onClose,
  onTrain,
}: {
  floor: Floor | null;
  open: boolean;
  onClose: () => void;
  onTrain: (id: string) => void;
}) {
  // хуки до раннего return
  const [tab, setTab] = React.useState<"lesson" | "handbook">("lesson");
  React.useEffect(() => {
    if (open) setTab("lesson");
  }, [open, floor?.id]);

  if (!floor) return null;

  const cards: DeckCard[] = (floor.lessons && floor.lessons.length
    ? floor.lessons.map((l) => ({ ...l, accent: floor.hue }))
    : fallbackLessons(floor));
  const hb = getHandbook(floor.id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      label={`Детальный урок · ${floor.tag}`}
      title={floor.name}
      maxWidth="46rem"
    >
      {/* вкладки: Урок / Справочник */}
      <div className="lesson-tabs">
        {([
          ["lesson", "Урок", GraduationCap],
          ["handbook", "Справочник", BookText],
        ] as const).map(([k, label, Ico]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={"lesson-tab" + (tab === k ? " on" : "")}
            style={{ ["--c" as string]: floor.hue }}
          >
            <Ico size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "lesson" ? (
        <>
          <div className="lesson-hint">
            <GraduationCap size={15} style={{ color: floor.hue }} />
            Листай карточки темы — теория, разбор оценивания и примеры. ← / → или
            стрелки.
          </div>
          <CarouselDeck cards={cards} />
        </>
      ) : (
        <Handbook floor={floor} hb={hb} />
      )}

      <button
        className="lesson-train"
        onClick={() => onTrain(floor.id)}
        style={{ ["--c" as string]: floor.hue }}
      >
        <Dumbbell size={16} />
        Тренировать тему
      </button>

      <style jsx>{`
        .lesson-tabs {
          display: flex;
          gap: 6px;
          margin: 0 0 14px;
          border-bottom: 1px solid rgb(var(--line) / 0.4);
          padding-bottom: 10px;
        }
        .lesson-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgb(var(--line) / 0.4);
          background: transparent;
          color: rgb(var(--mid));
          border-radius: 10px;
          padding: 7px 12px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
        }
        .lesson-tab.on {
          color: rgb(var(--bg-0));
          background: var(--c);
          border-color: var(--c);
        }
        .lesson-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 2px 0 16px;
          font-size: 12.5px;
          color: rgb(var(--mid));
        }
        .lesson-train {
          margin-top: 18px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 13px;
          border: 0;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          color: #0a0e18;
          cursor: pointer;
          background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 70%, #000));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4),
            0 10px 26px -12px var(--c);
        }
      `}</style>
    </Modal>
  );
}
