/**
 * GET /api/essay/attempts
 *
 * Возвращает историю сочинений текущего пользователя (без content и review —
 * только метаданные для списка). Полный разбор — через /api/essay/attempt/[id].
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const attempts = await prisma.essayAttempt.findMany({
    where: { userId, status: "reviewed" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      textId: true,
      wordCount: true,
      totalScore: true,
      maxScore: true,
      createdAt: true,
      reviewedAt: true,
      text: { select: { title: true } },
    },
  });

  return NextResponse.json({ attempts });
}
