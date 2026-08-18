/**
 * GET /api/essay/texts
 *
 * Возвращает список всех исходных текстов для тренажёра сочинения.
 * Без тела текста (только метаданные) — тело весит много, чтобы не тащить
 * все 12 разом на страницу выбора.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const texts = await prisma.essayText.findMany({
    select: {
      id: true,
      title: true,
      authorHint: true,
      difficulty: true,
      problems: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ texts });
}
