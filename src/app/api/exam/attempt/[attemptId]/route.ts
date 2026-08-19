/**
 * GET /api/exam/attempt/[attemptId]
 *
 * Возвращает состояние активной попытки для восстановления после перезагрузки.
 * Включает phase, исходный текст сочинения (если есть), черновик сочинения.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";
import { getExamSpec } from "@/data/exam-specs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { attemptId: string } }
) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: params.attemptId },
    include: { answers: true },
  });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Попытка не найдена" }, { status: 404 });
  }

  const spec = getExamSpec(attempt.subjectKey);
  if (!spec) return NextResponse.json({ error: "Спецификация не найдена" }, { status: 500 });

  const variantWithCorrect = attempt.variant as unknown as Array<{
    taskNumber: number;
    taskDbId: string;
    primaryScore: number;
    topicId: string;
    correct: number;
  }>;

  const taskIds = variantWithCorrect.map(v => v.taskDbId);
  const tasks = await prisma.task.findMany({ where: { id: { in: taskIds } } });
  const taskById = new Map(tasks.map(t => [t.id, t]));

  const clientTasks = variantWithCorrect.map(v => {
    const t = taskById.get(v.taskDbId);
    if (!t) return null;
    try {
      const parsed = JSON.parse(t.body) as { question: string; options: string[] };
      const specTask = spec.tasks.find(s => s.taskNumber === v.taskNumber);
      return {
        taskNumber: v.taskNumber,
        description: specTask?.description ?? "",
        question: parsed.question,
        options: parsed.options,
        primaryScore: v.primaryScore,
      };
    } catch { return null; }
  }).filter(Boolean);

  const answersMap: Record<number, number | null> = {};
  for (const a of attempt.answers) answersMap[a.taskNumber] = a.answer;

  // Отдельно грузим текст сочинения, если есть essayTextId (проще чем через include с типами)
  let essayText = null;
  if (attempt.essayTextId) {
    essayText = await prisma.essayText.findUnique({
      where: { id: attempt.essayTextId },
      select: { id: true, title: true, authorHint: true, body: true, problems: true },
    });
  }

  return NextResponse.json({
    attemptId: attempt.id,
    subjectKey: attempt.subjectKey,
    displayName: spec.displayName,
    durationMinutes: attempt.durationMinutes,
    maxPrimaryScore: attempt.maxPrimaryScore,
    hasEssayPhase: spec.hasEssayPhase,
    startedAt: attempt.startedAt.toISOString(),
    pausedAt: attempt.pausedAt?.toISOString() ?? null,
    pausedMillis: attempt.pausedMillis,
    status: attempt.status,
    phase: attempt.phase,
    tasks: clientTasks,
    answers: answersMap,
    essayTextId: attempt.essayTextId,
    essayText,
    essayContent: attempt.essayContent ?? "",
  });
}
