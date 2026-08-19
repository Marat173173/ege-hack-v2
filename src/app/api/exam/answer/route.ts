/**
 * POST /api/exam/answer
 * Body: { attemptId, taskNumber, answer, elapsedSecondsAtAnswer }
 *
 * Сохраняет ответ + время (от старта, без пауз), когда он был дан.
 * Время нужно для «factual score» — отделить ответы ДО звонка от ПОСЛЕ.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: {
    attemptId?: string;
    taskNumber?: number;
    answer?: number | null;
    elapsedSecondsAtAnswer?: number;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "невалидный JSON" }, { status: 400 });
  }

  const { attemptId, taskNumber, answer, elapsedSecondsAtAnswer } = body;
  if (!attemptId || typeof taskNumber !== "number") {
    return NextResponse.json({ error: "attemptId и taskNumber обязательны" }, { status: 400 });
  }
  if (answer !== null && (typeof answer !== "number" || answer < 0 || answer > 3)) {
    return NextResponse.json({ error: "answer должен быть 0-3 или null" }, { status: 400 });
  }

  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Попытка не найдена" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "Попытка уже завершена" }, { status: 400 });
  }

  await prisma.examAnswer.upsert({
    where: { attemptId_taskNumber: { attemptId, taskNumber } },
    create: {
      attemptId,
      taskNumber,
      answer,
      elapsedSecondsAtAnswer:
        typeof elapsedSecondsAtAnswer === "number" ? Math.round(elapsedSecondsAtAnswer) : null,
    },
    update: {
      answer,
      elapsedSecondsAtAnswer:
        typeof elapsedSecondsAtAnswer === "number" ? Math.round(elapsedSecondsAtAnswer) : undefined,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
