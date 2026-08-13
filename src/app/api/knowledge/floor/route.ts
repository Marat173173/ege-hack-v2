/**
 * GET /api/knowledge/floor?id=<floorId>
 *
 * Возвращает материалы этажа. Три формата ID:
 *   1. "3.7.6"       — legacy русский (без префикса) → subject="russian"
 *   2. "social-1.3"  — новый формат: subject извлекается из префикса
 *   3. "rus-orf"     — legacy-имя раздела русского → все подтемы этого раздела
 *
 * Формат ответа:
 * { floorId, subject, subtopics: [{code, title, materials: [{id, kind, title, text}]}] }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { FIPI_RU } from "@/data/fipi-codifier-ru";
import { FIPI_SOCIAL } from "@/data/fipi-codifier-social";
import { FIPI_HISTORY } from "@/data/fipi-codifier-history";
import { FIPI_MATH } from "@/data/fipi-codifier-math";
import { FIPI_MATH_BASE } from "@/data/fipi-codifier-math-base";
import { FIPI_PHYSICS } from "@/data/fipi-codifier-physics";
import { FIPI_LITERATURE } from "@/data/fipi-codifier-literature";
import { FIPI_ENGLISH } from "@/data/fipi-codifier-english";
import type { FipiTopic } from "@/data/fipi-codifier-ru";

export const runtime = "nodejs";
export const revalidate = 300;

const kindOrder = (k: string) =>
  ({ rule: 0, example: 1, mistake: 2, definition: 3 })[k] ?? 99;

/** Реестр всех кодификаторов и их subject в БД. */
const CODIFIERS: Record<string, { topics: FipiTopic[]; dbSubject: string }> = {
  russian:    { topics: FIPI_RU,         dbSubject: "russian" },
  social:     { topics: FIPI_SOCIAL,     dbSubject: "social" },
  history:    { topics: FIPI_HISTORY,    dbSubject: "history" },
  math:       { topics: FIPI_MATH,       dbSubject: "math" },
  "math-base":{ topics: FIPI_MATH_BASE,  dbSubject: "math-base" },
  physics:    { topics: FIPI_PHYSICS,    dbSubject: "physics" },
  literature: { topics: FIPI_LITERATURE, dbSubject: "literature" },
  english:    { topics: FIPI_ENGLISH,    dbSubject: "english" },
};

/** Определяет subject и код(ы) подтем по floorId. */
function resolveFloor(floorId: string): {
  subject: string;
  codes: string[];
  subtopics: { code: string; title: string }[];
} | null {
  // 1. Новый префиксованный формат: "social-1.3", "math-base-2.5"
  const prefixMatch = floorId.match(/^([a-z-]+?)-([0-9А-Яа-яA-Z].+)$/);
  if (prefixMatch) {
    const [, prefix, code] = prefixMatch;
    // math-base → "math-base"; social → "social"
    const subjectKey = prefix in CODIFIERS ? prefix : `${prefix}-base` in CODIFIERS ? `${prefix}-base` : null;
    if (subjectKey && CODIFIERS[subjectKey]) {
      const topic = CODIFIERS[subjectKey].topics.find(t => t.code === code);
      if (topic) return {
        subject: CODIFIERS[subjectKey].dbSubject,
        codes: [code],
        subtopics: [{ code: topic.code, title: topic.title }],
      };
    }
  }

  // 2. Legacy русский код "3.7.6" → одна подтема
  if (/^\d+\.\d+/.test(floorId)) {
    const topic = FIPI_RU.find(t => t.code === floorId);
    if (topic) return {
      subject: "russian",
      codes: [floorId],
      subtopics: [{ code: topic.code, title: topic.title }],
    };
  }

  // 3. Legacy-раздел русского "rus-orf" → все подтемы раздела через parent
  const legacy = FIPI_RU.filter(t => t.parent === floorId);
  if (legacy.length > 0) {
    return {
      subject: "russian",
      codes: legacy.map(t => t.code),
      subtopics: legacy.map(t => ({ code: t.code, title: t.title })),
    };
  }

  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const floorId = url.searchParams.get("id");
  if (!floorId) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

  const resolved = resolveFloor(floorId);
  if (!resolved) return NextResponse.json({ floorId, subject: null, subtopics: [] });

  const { subject, codes, subtopics } = resolved;

  const chunks = await prisma.knowledgeChunk.findMany({
    where: { subject, topicCode: { in: codes } },
    select: { id: true, kind: true, title: true, text: true, topicCode: true },
  });

  const byCode = new Map<string, typeof chunks>();
  for (const c of chunks) {
    if (!c.topicCode) continue;
    if (!byCode.has(c.topicCode)) byCode.set(c.topicCode, []);
    byCode.get(c.topicCode)!.push(c);
  }

  type ChunkRow = (typeof chunks)[number];
  const result = subtopics.map((t) => ({
    code: t.code,
    title: t.title,
    materials: (byCode.get(t.code) ?? []).sort(
      (a: ChunkRow, b: ChunkRow) => kindOrder(a.kind) - kindOrder(b.kind)
    ),
  }));

  return NextResponse.json({ floorId, subject, subtopics: result });
}
