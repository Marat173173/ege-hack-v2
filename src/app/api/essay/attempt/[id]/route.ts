/**
 * GET /api/essay/attempt/[id]
 *
 * Возвращает полную попытку с текстом сочинения и разбором.
 * Используется для повторного просмотра результата.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const attempt = await prisma.essayAttempt.findUnique({
    where: { id: params.id },
    include: {
      text: { select: { id: true, title: true, body: true, problems: true } },
    },
  });

  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Попытка не найдена" }, { status: 404 });
  }

  return NextResponse.json({
    id: attempt.id,
    text: attempt.text,
    content: attempt.content,
    wordCount: attempt.wordCount,
    status: attempt.status,
    review: attempt.review,
    totalScore: attempt.totalScore,
    maxScore: attempt.maxScore,
    createdAt: attempt.createdAt,
    reviewedAt: attempt.reviewedAt,
  });
}
