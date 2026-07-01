/**
 * GET /api/tasks/floor?id=<floorId>&limit=N
 *
 * Возвращает случайные тренировочные задания. Два режима:
 *  1) floorId = код кодификатора ("3.7.6") — задания этой подтемы
 *  2) floorId = legacy ("rus-orf") — задания всех подтем этого раздела
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { FIPI_RU } from "@/data/fipi-codifier-ru";

export const runtime = "nodejs";

type StoredTaskBody = { question: string; options: string[]; correct: number };

const isFipiCode = (s: string) => /^\d+\.\d+/.test(s);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const floorId = url.searchParams.get("id");
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "5", 10)));

  if (!floorId) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  }

  let codes: string[];
  if (isFipiCode(floorId)) {
    codes = [floorId];
  } else {
    codes = FIPI_RU.filter((t) => t.parent === floorId).map((t) => t.code);
  }

  if (codes.length === 0) {
    return NextResponse.json({ floorId, tasks: [] });
  }

  type Row = {
    id: string;
    title: string;
    body: string;
    answer: string | null;
    explanation: string | null;
    topicId: string;
  };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT id, title, body, answer, explanation, "topicId"
    FROM "Task"
    WHERE exam = 'ege' AND "topicId" = ANY(${codes})
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
    } catch {
      return [];
    }
  });

  return NextResponse.json({ floorId, tasks });
}
