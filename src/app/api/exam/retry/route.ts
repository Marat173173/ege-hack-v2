/**
 * POST /api/exam/retry
 * Body: { attemptId }
 *
 * Создаёт новую попытку с ТЕМ ЖЕ вариантом заданий, что и указанная старая.
 * Ученик может «взять реванш» на тех же задачах и увидеть прогресс.
 *
 * Требует авторизации + владения исходной попыткой.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";
import { checkRateLimit } from "@/lib/ratelimit";
import { getExamSpec } from "@/data/exam-specs";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Тот же лимит что у /start — 5 попыток в час
  const rl = await checkRateLimit(req, {
    identifier: `exam-start:${userId}`,
    limit: 5,
    window: "1 h",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуй через час." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: { attemptId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "невалидный JSON" }, { status: 400 }); }

  const { attemptId } = body;
  if (!attemptId) return NextResponse.json({ error: "attemptId обязателен" }, { status: 400 });

  const source = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
  if (!source || source.userId !== userId) {
    return NextResponse.json({ error: "Попытка не найдена" }, { status: 404 });
  }

  const spec = getExamSpec(source.subjectKey);
  if (!spec) return NextResponse.json({ error: "Спецификация не найдена" }, { status: 500 });

  // Копируем variant в новую попытку. Prisma сериализует Json автоматически.
  const attempt = await prisma.examAttempt.create({
    data: {
      userId,
      subjectKey: source.subjectKey,
      durationMinutes: source.durationMinutes,
      maxPrimaryScore: source.maxPrimaryScore,
      maxPrimaryScoreTotal: source.maxPrimaryScoreTotal,
      variant: source.variant as never,
      status: "in_progress",
    },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    redirectTo: `/exam/${attempt.id}`,
  });
}
