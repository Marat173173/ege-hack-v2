/**
 * GET /api/tasks/floor?id=rus-orf&limit=5
 *
 * Возвращает N случайных тренировочных заданий для этажа
 * из таблицы Task. Задания предварительно сгенерированы
 * через scripts/generate-tasks.ts.
 *
 * Формат задания:
 * {
 *   id: string,
 *   title: string,
 *   question: string,   // формулировка
 *   options: string[],  // 4 варианта
 *   correct: number,    // индекс правильного (0-3)
 *   explanation: string,
 *   topicCode: string,
 * }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { FIPI_RU } from "@/data/fipi-codifier-ru";

export const runtime = "nodejs";

type StoredTaskBody = {
  question: string;
  options: string[];
  correct: number;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const floorId = url.searchParams.get("id");
  const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") ?? "5", 10)));

  if (!floorId) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  }

  const codes = FIPI_RU.filter((t) => t.parent === floorId).map((t) => t.code);
  if (codes.length === 0) {
    return NextResponse.json({ floorId, tasks: [] });
  }

  // Достаём случайные N заданий по темам этажа.
  // Postgres умеет ORDER BY random() — просто и достаточно быстро для сотен строк.
  const rows = await prisma.$queryRaw<
    {
      id: string;
      title: string;
      body: string;
      answer: string | null;
      explanation: string | null;
      topicId: string;
    }[]
  >`
    SELECT id, title, body, answer, explanation, "topicId"
    FROM "Task"
    WHERE exam = 'ege' AND "topicId" = ANY(${codes})
    ORDER BY random()
    LIMIT ${limit}
  `;

  type Row = {
    id: string;
    title: string;
    body: string;
    answer: string | null;
    explanation: string | null;
    topicId: string;
  };

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
      // Битое задание — пропускаем
      return [];
    }
  });

  return NextResponse.json({ floorId, tasks });
}
