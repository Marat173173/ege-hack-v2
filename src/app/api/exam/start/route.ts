/**
 * POST /api/exam/start
 * Body: { subjectKey: "russian" | "social-multi" | "math-multi" }
 *
 * Создаёт ExamAttempt, генерирует вариант, для русского выбирает случайный
 * essayTextId. Возвращает phase="tests".
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";
import { generateVariant } from "@/lib/exam/variant-builder";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

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
    const { spec, tasks, essayTextId } = await generateVariant(subjectKey);
    if (tasks.length === 0) {
      return NextResponse.json({ error: "Не удалось собрать вариант — нет заданий" }, { status: 500 });
    }
    if (spec.hasEssayPhase && !essayTextId) {
      return NextResponse.json({
        error: "Не удалось выбрать исходный текст для сочинения. Обратись к администратору.",
      }, { status: 500 });
    }

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
        phase: "tests",
        essayTextId,
      },
    });

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
      hasEssayPhase: spec.hasEssayPhase,
      startedAt: attempt.startedAt.toISOString(),
      pausedAt: null,
      pausedMillis: 0,
      phase: "tests",
      essayTextId,
      tasks: clientTasks,
    });
  } catch (err) {
    console.error("[exam/start]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
