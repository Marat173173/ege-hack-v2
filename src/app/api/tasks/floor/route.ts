/**
 * GET /api/tasks/floor?id=<floorId>&limit=N
 *
 * Возвращает случайные задания. Форматы floorId — те же, что в /api/knowledge/floor.
 * Внутри БД Task.topicId хранится префиксованно для новых предметов:
 *   русский: topicId="3.7.6"
 *   обществознание: topicId="social-1.3"
 *   и т.д.
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

type StoredTaskBody = { question: string; options: string[]; correct: number };

const CODIFIERS: Record<string, { topics: FipiTopic[]; exam: string; prefix?: string }> = {
  russian:    { topics: FIPI_RU,         exam: "ege" },                        // topicId="3.7.6"
  social:     { topics: FIPI_SOCIAL,     exam: "ege", prefix: "social" },      // topicId="social-1.3"
  history:    { topics: FIPI_HISTORY,    exam: "ege", prefix: "history" },
  math:       { topics: FIPI_MATH,       exam: "ege", prefix: "math" },
  "math-base":{ topics: FIPI_MATH_BASE,  exam: "ege-base", prefix: "math-base" },
  physics:    { topics: FIPI_PHYSICS,    exam: "ege", prefix: "physics" },
  literature: { topics: FIPI_LITERATURE, exam: "ege", prefix: "literature" },
  english:    { topics: FIPI_ENGLISH,    exam: "ege", prefix: "english" },
};

function resolveFloor(floorId: string) {
  // Новый префикс: "social-1.3", "math-base-2.5"
  const prefixMatch = floorId.match(/^([a-z-]+?)-([0-9А-Яа-яA-Z].+)$/);
  if (prefixMatch) {
    const [, prefix, code] = prefixMatch;
    const subjectKey = prefix in CODIFIERS ? prefix : `${prefix}-base` in CODIFIERS ? `${prefix}-base` : null;
    if (subjectKey && CODIFIERS[subjectKey]) {
      const t = CODIFIERS[subjectKey].topics.find(t => t.code === code);
      if (t) return {
        exam: CODIFIERS[subjectKey].exam,
        topicIds: [`${CODIFIERS[subjectKey].prefix}-${code}`],
      };
    }
  }
  // Legacy русский
  if (/^\d+\.\d+/.test(floorId)) {
    const t = FIPI_RU.find(t => t.code === floorId);
    if (t) return { exam: "ege", topicIds: [floorId] };
  }
  // Legacy-раздел "rus-orf"
  const legacy = FIPI_RU.filter(t => t.parent === floorId);
  if (legacy.length) return { exam: "ege", topicIds: legacy.map(t => t.code) };

  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const floorId = url.searchParams.get("id");
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "5", 10)));

  if (!floorId) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

  const resolved = resolveFloor(floorId);
  if (!resolved) return NextResponse.json({ floorId, tasks: [] });

  type Row = {
    id: string; title: string; body: string; answer: string | null;
    explanation: string | null; topicId: string;
  };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT id, title, body, answer, explanation, "topicId"
    FROM "Task"
    WHERE exam = ${resolved.exam} AND "topicId" = ANY(${resolved.topicIds})
    ORDER BY random()
    LIMIT ${limit}
  `;

  const tasks = rows.flatMap((r: Row) => {
    try {
      const parsed = JSON.parse(r.body) as StoredTaskBody;
      return [{
        id: r.id,
        title: r.title,
        question: parsed.question,
        options: parsed.options,
        correct: parsed.correct,
        explanation: r.explanation ?? "",
        topicCode: r.topicId,
      }];
    } catch { return []; }
  });

  return NextResponse.json({ floorId, tasks });
}
