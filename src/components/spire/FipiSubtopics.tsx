"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MessageCircle, BookOpen } from "lucide-react";
import { FIPI_RU } from "@/data/fipi-codifier-ru";

const INITIAL_VISIBLE = 3;

/**
 * Секция подтем ФИПИ для конкретного этажа Шпиля.
 *
 * Показывает список подтем кодификатора ФИПИ 2026, привязанных к этажу
 * через `parent`. Клик по подтеме ведёт на /tutor?topic=<code>&subject=russian
 * — ИИ-репетитор автоматически объясняет тему.
 *
 * Пока только русский: если этаж не rus-*, компонент ничего не рендерит.
 */
export function FipiSubtopics({ floorId }: { floorId: string }) {
  const [expanded, setExpanded] = React.useState(false);

  const isRussian = floorId.startsWith("rus-");
  const subtopics = React.useMemo(
    () => (isRussian ? FIPI_RU.filter((t) => t.parent === floorId) : []),
    [isRussian, floorId]
  );

  if (subtopics.length === 0) return null;

  const visible = expanded ? subtopics : subtopics.slice(0, INITIAL_VISIBLE);
  const hidden = subtopics.length - visible.length;

  return (
    <div className="mt-4 rounded-xl border border-line bg-white/[0.02] p-3">
      <div className="mb-2.5 flex items-center gap-1.5">
        <BookOpen size={13} className="text-lo" />
        <span className="hud-label text-[9px] text-lo">
          программа фипи · {subtopics.length} {subtopics.length === 1 ? "тема" : "тем"}
        </span>
      </div>

      <div className="space-y-1.5">
        {visible.map((t) => (
          <SubtopicRow key={t.code} code={t.code} title={t.title} />
        ))}
      </div>

      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] text-mid transition-colors hover:text-hi"
        >
          Ещё {hidden} <ChevronDown size={12} />
        </button>
      )}
    </div>
  );
}

function SubtopicRow({ code, title }: { code: string; title: string }) {
  return (
    <a
      href={`/tutor?topic=${encodeURIComponent(code)}&subject=russian`}
      className="group flex items-start gap-2.5 rounded-lg border border-transparent px-2 py-2 transition-all hover:border-accent/30 hover:bg-white/[0.03]"
    >
      <span className="mt-0.5 shrink-0 rounded font-mono text-[10px] text-lo group-hover:text-accent">
        {code}
      </span>
      <span className="flex-1 text-[12px] leading-snug text-mid transition-colors group-hover:text-hi">
        {title}
      </span>
      <MessageCircle
        size={12}
        className="mt-0.5 shrink-0 text-lo opacity-0 transition-opacity group-hover:opacity-100"
      />
    </a>
  );
}
