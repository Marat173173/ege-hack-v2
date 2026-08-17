/**
 * POST /api/exam/start
 * Body: { subjectKey: "russian" | "social-multi" | "math-multi" }
 *
 * Создаёт ExamAttempt, генерирует вариант, сохраняет taskDbId в БД,
 * возвращает клиенту задания БЕЗ правильных ответов (correct spared).
 *
 * Требует авторизации.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";
import { generateVariant } from "@/lib/exam/variant-builder";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  // Rate limit: 5 попыток симулятора в час — иначе будут накручивать
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

  let body: { subjectKey?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "невалидный JSON" }, { status: 400 }); }

  const subjectKey = body.subjectKey;
  if (!subjectKey) return NextResponse.json({ error: "subjectKey обязателен" }, { status: 400 });

  try {
    const { spec, tasks } = await generateVariant(subjectKey);
    if (tasks.length === 0) {
      return NextResponse.json({ error: "Не удалось собрать вариант — нет заданий" }, { status: 500 });
    }

    // Создаём попытку в БД
    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        subjectKey,
        durationMinutes: spec.durationMinutes,
        maxPrimaryScore: spec.maxPrimaryScorePart1,
        maxPrimaryScoreTotal: spec.maxPrimaryScoreTotal,
        variant: tasks.map(t => ({
          taskNumber: t.taskNumber,
          taskDbId: t.taskDbId,
          primaryScore: t.primaryScore,
          topicId: t.topicId,
          correct: t.correct,
        })),
        status: "in_progress",
      },
    });

    // Клиенту отдаём БЕЗ правильных ответов и без разборов
    const clientTasks = tasks.map(t => ({
      taskNumber: t.taskNumber,
      description: t.description,
      question: t.question,
      options: t.options,
      primaryScore: t.primaryScore,
    }));

    return NextResponse.json({
      attemptId: attempt.id,
      subjectKey,
      displayName: spec.displayName,
      durationMinutes: spec.durationMinutes,
      maxPrimaryScore: spec.maxPrimaryScorePart1,
      startedAt: attempt.startedAt.toISOString(),
      tasks: clientTasks,
    });
  } catch (err) {
    console.error("[exam/start]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
