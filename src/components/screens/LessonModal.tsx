"use client";

import React from "react";
import {
  Dumbbell,
  BookOpen,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Scale,
  MessageCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { Floor } from "@/data/types";

type Material = { id: string; kind: string; title: string; text: string };
type Subtopic = { code: string; title: string; materials: Material[] };
type ApiResp = { floorId: string; subtopics: Subtopic[] };

const KIND_META: Record<string, { label: string; Icon: typeof BookOpen; color: string }> = {
  rule: { label: "Правило", Icon: BookOpen, color: "rgb(var(--accent))" },
  example: { label: "Разбор", Icon: Lightbulb, color: "#5BE3B0" },
  mistake: { label: "Типичные ошибки", Icon: AlertTriangle, color: "#FFC65B" },
  definition: { label: "Термины", Icon: Scale, color: "#B4A0FF" },
};

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
  const [data, setData] = React.useState<Subtopic[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [activeCode, setActiveCode] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !floor) return;
    setLoading(true);
    setError(null);
    setData(null);
    setActiveCode(null);

    fetch(`/api/knowledge/floor?id=${encodeURIComponent(floor.id)}`)
      .then((r) => {
        // без проверки r.ok 500 с JSON-телом маскировался под «материалы готовятся»
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: ApiResp) => {
        const subs = json.subtopics ?? [];
        setData(subs);
        setActiveCode(subs[0]?.code ?? null);
      })
      .catch(() => setError("Не удалось загрузить материалы. Попробуй ещё раз."))
      .finally(() => setLoading(false));
  }, [open, floor?.id]);

  // Кэш последнего этажа: при закрытии ModalHost обнуляет floor, и мгновенный
  // return null размонтировал бы Modal (обрыв exit-анимации + новый маунт на
  // каждое открытие). С кэшем Modal живёт с open=false и закрывается плавно.
  const lastFloorRef = React.useRef<Floor | null>(null);
  // кэш обновляем только при open: иначе выбор другого этажа во время
  // exit-анимации подменял бы контент затухающей панели
  if (open && floor) lastFloorRef.current = floor;
  // open → только живой этаж (не резолвится id — не показываем чужой урок);
  // закрыто → ТОЛЬКО кэш: живой floor тут может быть уже другим этажом
  // (кросс-открытие в окно exit-анимации) — затухающая панель держит своё
  const f = open ? floor : lastFloorRef.current;

  if (!f) return null;

  const active = data?.find((s) => s.code === activeCode) ?? null;
  const hasContent = !loading && data && data.length > 0;
  const empty = !loading && data && data.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      label={`Детальный урок · ${f.tag}`}
      title={f.name}
      maxWidth="52rem"
    >
      {loading && (
        <div className="lm-loading">
          <Loader2 size={16} className="animate-spin" />
          Загружаю материалы по кодификатору ФИПИ…
        </div>
      )}

      {error && (
        <div className="lm-error">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {empty && (
        <div className="lm-empty">
          <BookOpen size={18} style={{ color: f.hue }} />
          <div>
            <b>Материалы этой темы готовятся.</b>
            <p>Задай вопрос репетитору — он объяснит суть и разберёт задание.</p>
          </div>
        </div>
      )}

      {hasContent && data && (
        <>
          <div className="lm-subtabs">
            <span className="lm-hint-label">Программа ФИПИ 2026 · {data.length} тем</span>
            <div className="lm-subtabs-scroll">
              {data.map((s) => (
                <button
                  key={s.code}
                  onClick={() => setActiveCode(s.code)}
                  className={"lm-subtab" + (s.code === activeCode ? " on" : "")}
                  style={{ ["--c" as string]: f.hue }}
                  title={s.title}
                >
                  <span className="lm-subtab-code">{s.code}</span>
                  <span className="lm-subtab-title">{s.title}</span>
                </button>
              ))}
            </div>
          </div>

          {active && (
            <div className="lm-active">
              <div className="lm-active-head">
                <span className="lm-active-code">{active.code}</span>
                <h3 className="lm-active-title">{active.title}</h3>
                <a
                  href={`/tutor?topic=${encodeURIComponent(active.code)}&subject=russian`}
                  className="lm-ask"
                >
                  <MessageCircle size={13} /> Спросить репетитора
                </a>
              </div>

              {active.materials.length === 0 ? (
                <div className="lm-material lm-material-empty">
                  Материалы этой подтемы генерируются. Задай вопрос репетитору — он объяснит.
                </div>
              ) : (
                <div className="lm-materials">
                  {active.materials.map((m) => {
                    const meta = KIND_META[m.kind] ?? KIND_META.rule;
                    return (
                      <div key={m.id} className="lm-material">
                        <div className="lm-material-h" style={{ color: meta.color }}>
                          <meta.Icon size={13} /> {meta.label}
                        </div>
                        <h4 className="lm-material-title">{m.title}</h4>
                        <p className="lm-material-body">{m.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <button
        className="lm-train"
        onClick={() => onTrain(f.id)}
        style={{ ["--c" as string]: f.hue }}
      >
        <Dumbbell size={16} />
        Тренировать тему
      </button>

      <style jsx>{`
        .lm-loading, .lm-error, .lm-empty {
          display: flex; align-items: center; gap: 10px;
          padding: 20px 4px; font-size: 13.5px; color: rgb(var(--mid));
        }
        .lm-error { color: #ffc65b; }
        .lm-empty { padding: 24px 4px; align-items: flex-start; }
        .lm-empty p {
          margin: 4px 0 0; font-size: 12.5px; line-height: 1.5; color: rgb(var(--lo));
        }
        .lm-empty b { display: block; margin-bottom: 3px; color: rgb(var(--hi)); }

        .lm-subtabs {
          margin: 0 0 14px; padding-bottom: 12px;
          border-bottom: 1px solid rgb(var(--line) / 0.4);
        }
        .lm-hint-label {
          display: block; margin-bottom: 8px;
          font-family: var(--mono); font-size: 11px;
          letter-spacing: 0.1em; text-transform: uppercase; color: rgb(var(--mid));
        }
        /* мобайл: горизонтальная лента чипов (6 подтем = 6 строк съедали весь
           первый экран урока); десктоп: перенос как раньше */
        .lm-subtabs-scroll {
          display: flex; flex-wrap: nowrap; gap: 6px;
          overflow-x: auto; padding-bottom: 6px;
          -webkit-overflow-scrolling: touch; scrollbar-width: thin;
        }
        @media (min-width: 768px) {
          .lm-subtabs-scroll { flex-wrap: wrap; overflow-x: visible; padding-bottom: 0; }
        }
        .lm-subtab {
          flex: 0 0 auto;
          display: inline-flex; align-items: center; gap: 6px;
          max-width: 100%; min-height: 44px; padding: 8px 12px;
          border: 1px solid rgb(var(--line) / 0.4);
          background: transparent; color: rgb(var(--mid));
          border-radius: 8px; font-size: 12px; cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .lm-subtab:hover { color: rgb(var(--hi)); border-color: rgb(var(--line)); }
        .lm-subtab.on {
          /* фиксированные тёмные чернила: rgb(var(--bg-0)) в светлой теме
             давал белёсый текст на цветной заливке (контраст ~2:1) */
          color: #070a14; background: var(--c); border-color: var(--c);
        }
        .lm-subtab-code { font-family: var(--mono); font-size: 10px; opacity: 0.8; }
        .lm-subtab-title {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px;
        }

        .lm-active { margin-bottom: 18px; }
        .lm-active-head {
          display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
          margin-bottom: 12px; padding-bottom: 12px;
          border-bottom: 1px solid rgb(var(--line) / 0.3);
        }
        .lm-active-code {
          font-family: var(--mono); font-size: 11px;
          padding: 3px 7px; border-radius: 6px;
          background: rgb(var(--glass-hi) / 0.06); color: rgb(var(--lo));
        }
        .lm-active-title {
          flex: 1; min-width: 200px; margin: 0; overflow-wrap: break-word;
          font-family: var(--serif); font-size: 16px; line-height: 1.3; color: rgb(var(--hi));
        }
        .lm-ask {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 10px;
          border: 1px solid rgb(var(--accent) / 0.35);
          background: rgb(var(--accent) / 0.08);
          color: rgb(var(--accent));
          border-radius: 8px; font-size: 12px; text-decoration: none;
        }
        .lm-ask:hover { background: rgb(var(--accent) / 0.14); }

        /* minmax(0,1fr): без него min-content длинного слова растягивал
           карточки (867px в 390px-вьюпорте — весь урок уезжал за правый край) */
        .lm-materials { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
        .lm-material {
          border: 1px solid rgb(var(--line) / 0.4);
          background: rgb(var(--glass-hi) / 0.02);
          border-radius: 12px; padding: 14px 16px;
        }
        .lm-material-empty {
          color: rgb(var(--mid)); font-size: 13px;
          text-align: center; padding: 20px;
        }
        .lm-material-h {
          display: flex; align-items: center; gap: 6px;
          font-family: var(--mono); font-size: 11px;
          letter-spacing: 0.1em; text-transform: uppercase;
          margin-bottom: 8px;
        }
        .lm-material-title {
          margin: 0 0 8px; font-size: 14.5px; font-weight: 600;
          color: rgb(var(--hi)); line-height: 1.35; overflow-wrap: break-word;
        }
        .lm-material-body {
          margin: 0; font-size: 13.5px; line-height: 1.55;
          color: rgb(var(--mid)); white-space: pre-wrap;
          overflow-wrap: anywhere; /* длинные слова/URL из БД не раздувают ширину */
        }

        .lm-train {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          /* sticky-футер: CTA всегда виден, не нужно скроллить весь урок до низа */
          position: sticky; bottom: 0; z-index: 3;
          width: 100%; margin-top: 16px; min-height: 52px; padding: 14px;
          /* тёмные чернила фиксированно — см. .lm-subtab.on */
          border: none; background: var(--c); color: #070a14;
          font-weight: 700; font-size: 14px; border-radius: 14px;
          cursor: pointer; transition: filter 0.15s;
          box-shadow: 0 -16px 22px -10px rgb(var(--bg-1));
        }
        .lm-train:hover { filter: brightness(1.08); }
      `}</style>
    </Modal>
  );
}
