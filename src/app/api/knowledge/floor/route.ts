/**
 * GET /api/knowledge/floor?id=<floorId>
 *
 * Возвращает материалы по этажу. Два режима:
 *  1) floorId — код кодификатора ("3.7.6"): возвращает материалы этой подтемы.
 *  2) floorId — legacy-имя ("rus-orf"): возвращает подтемы через parent (совместимость).
 *
 * Формат ответа одинаковый:
 * {
 *   floorId: string,
 *   subtopics: [{ code, title, materials: [{id, kind, title, text}] }]
 * }
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { FIPI_RU } from "@/data/fipi-codifier-ru";

export const runtime = "nodejs";
export const revalidate = 300;

/** Порядок для показа: правило → разбор → ошибки → термины. */
function kindOrder(kind: string): number {
  switch (kind) {
    case "rule": return 0;
    case "example": return 1;
    case "mistake": return 2;
    case "definition": return 3;
    default: return 99;
  }
}

const isFipiCode = (s: string) => /^\d+\.\d+/.test(s);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const floorId = url.searchParams.get("id");

  if (!floorId) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  }

  // Определяем список кодов подтем
  let codes: string[];
  let subtopics: { code: string; title: string }[];

  if (isFipiCode(floorId)) {
    // Одна подтема
    const topic = FIPI_RU.find((t) => t.code === floorId);
    if (!topic) return NextResponse.json({ floorId, subtopics: [] });
    codes = [floorId];
    subtopics = [{ code: topic.code, title: topic.title }];
  } else {
    // legacy — по parent
    const subs = FIPI_RU.filter((t) => t.parent === floorId);
    codes = subs.map((t) => t.code);
    subtopics = subs.map((t) => ({ code: t.code, title: t.title }));
  }

  if (codes.length === 0) {
    return NextResponse.json({ floorId, subtopics: [] });
  }

  // Загружаем чанки
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { subject: "russian", topicCode: { in: codes } },
    select: { id: true, kind: true, title: true, text: true, topicCode: true },
  });

  // Группируем по коду
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
