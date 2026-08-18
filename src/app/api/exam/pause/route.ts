/**
 * POST /api/exam/pause
 * Body: { attemptId, action: "start" | "resume" }
 *
 * Управляет паузой в попытке. Логика:
 *   - "start": фиксирует момент начала паузы (pausedAt = now)
 *   - "resume": прошедшее с pausedAt добавляется к pausedMillis, pausedAt=null
 *
 * Клиент при подсчёте оставшегося времени вычитает pausedMillis из
 * (now - startedAt).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: { attemptId?: string; action?: "start" | "resume" };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "невалидный JSON" }, { status: 400 }); }

  const { attemptId, action } = body;
  if (!attemptId || (action !== "start" && action !== "resume")) {
    return NextResponse.json({ error: "attemptId и action обязательны" }, { status: 400 });
  }

  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Попытка не найдена" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "Попытка уже завершена" }, { status: 400 });
  }

  const now = new Date();

  if (action === "start") {
    // Уже на паузе — просто возвращаем текущее состояние
    if (attempt.pausedAt) return NextResponse.json({ pausedAt: attempt.pausedAt, pausedMillis: attempt.pausedMillis });
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { pausedAt: now },
    });
    return NextResponse.json({ pausedAt: now, pausedMillis: attempt.pausedMillis });
  }

  // resume
  if (!attempt.pausedAt) return NextResponse.json({ pausedAt: null, pausedMillis: attempt.pausedMillis });

  const delta = now.getTime() - attempt.pausedAt.getTime();
  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { pausedAt: null, pausedMillis: attempt.pausedMillis + delta },
  });
  return NextResponse.json({ pausedAt: null, pausedMillis: attempt.pausedMillis + delta });
}
