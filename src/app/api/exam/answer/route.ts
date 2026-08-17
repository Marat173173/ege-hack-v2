/**
 * POST /api/exam/answer
 * Body: { attemptId, taskNumber, answer } (answer — индекс варианта 0-3, или null для «пропущено»)
 *
 * Сохраняет ответ. До финализации ученик может менять ответы сколько угодно.
 * Правильность НЕ возвращаем — покажем только после финализации.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: { attemptId?: string; taskNumber?: number; answer?: number | null };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "невалидный JSON" }, { status: 400 }); }

  const { attemptId, taskNumber, answer } = body;
  if (!attemptId || typeof taskNumber !== "number") {
    return NextResponse.json({ error: "attemptId и taskNumber обязательны" }, { status: 400 });
  }
  if (answer !== null && (typeof answer !== "number" || answer < 0 || answer > 3)) {
    return NextResponse.json({ error: "answer должен быть 0-3 или null" }, { status: 400 });
  }

  // Проверяем, что попытка принадлежит юзеру и ещё активна
  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Попытка не найдена" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "Попытка уже завершена" }, { status: 400 });
  }

  // upsert ответа
  await prisma.examAnswer.upsert({
    where: { attemptId_taskNumber: { attemptId, taskNumber } },
    create: { attemptId, taskNumber, answer },
    update: { answer, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
