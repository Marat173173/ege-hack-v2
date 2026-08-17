/**
 * GET /api/exam/attempts?subject=russian
 *
 * Возвращает историю симуляторных попыток текущего пользователя.
 * Опциональный фильтр по subject.
 * Только базовые поля — не тащим весь variant и все ответы.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const subject = new URL(req.url).searchParams.get("subject");

  const attempts = await prisma.examAttempt.findMany({
    where: {
      userId,
      status: "finished",
      ...(subject ? { subjectKey: subject } : {}),
    },
    orderBy: { finalizedAt: "desc" },
    take: 30,
    select: {
      id: true,
      subjectKey: true,
      startedAt: true,
      finalizedAt: true,
      primaryScore: true,
      maxPrimaryScore: true,
      testScorePart1: true,
      forecastMin: true,
      forecastExpected: true,
      forecastMax: true,
      secondsSpent: true,
    },
  });

  return NextResponse.json({ attempts });
}
