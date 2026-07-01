/**
 * GET /api/knowledge/floor?id=rus-orf
 *
 * Возвращает все подтемы кодификатора ФИПИ, привязанные к этажу,
 * и их учебные материалы (правило/разбор/ошибки/термины) из БД.
 *
 * Формат ответа:
 * {
 *   floorId: "rus-orf",
 *   subtopics: [
 *     { code: "3.7.1", title: "...", materials: [
 *         { id, kind, title, text }, ...
 *       ] },
 *     ...
 *   ]
 * }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { FIPI_RU } from "@/data/fipi-codifier-ru";

export const runtime = "nodejs";
// материалы не меняются часто — кэшируем на клиенте
export const revalidate = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const floorId = url.searchParams.get("id");

  if (!floorId) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  }

  // 1. Найти все подтемы, привязанные к этому этажу
  const subtopics = FIPI_RU.filter((t) => t.parent === floorId);
  if (subtopics.length === 0) {
    return NextResponse.json({ floorId, subtopics: [] });
  }

  const codes = subtopics.map((t) => t.code);

  // 2. Достать все чанки для этих подтем разом (без embedding — большие поля не тащим)
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { subject: "russian", topicCode: { in: codes } },
    select: { id: true, kind: true, title: true, text: true, topicCode: true },
  });

  // 3. Сгруппировать чанки по подтеме
  const byCode = new Map<string, typeof chunks>();
  for (const c of chunks) {
    if (!c.topicCode) continue;
    const arr = byCode.get(c.topicCode) ?? [];
    arr.push(c);
    byCode.set(c.topicCode, arr);
  }

  const result = subtopics.map((t) => ({
    code: t.code,
    title: t.title,
    materials: (byCode.get(t.code) ?? []).sort(
      (a: (typeof chunks)[number], b: (typeof chunks)[number]) =>
        kindOrder(a.kind) - kindOrder(b.kind)
    ),
  }));

  return NextResponse.json({ floorId, subtopics: result });
}

/** Порядок для показа: правило → разбор → ошибки → термины */
function kindOrder(kind: string): number {
  switch (kind) {
    case "rule": return 0;
    case "example": return 1;
    case "mistake": return 2;
    case "definition": return 3;
    default: return 99;
  }
}
