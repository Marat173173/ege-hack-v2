/**
 * POST /api/exam/phase-transition
 * Body: { attemptId, targetPhase: "essay" }
 *
 * Переключает ExamAttempt.phase = "tests" → "essay".
 * Ученик решил тесты и готов писать сочинение.
 * Единый таймер продолжает идти.
 *
 * Требует, чтобы у предмета был hasEssayPhase.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";
import { getExamSpec } from "@/data/exam-specs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: { attemptId?: string; targetPhase?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "невалидный JSON" }, { status: 400 });
  }

  const { attemptId, targetPhase } = body;
  if (!attemptId) return NextResponse.json({ error: "attemptId обязателен" }, { status: 400 });
  if (targetPhase !== "essay") {
    return NextResponse.json({ error: "targetPhase должен быть 'essay'" }, { status: 400 });
  }

  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Попытка не найдена" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "Попытка уже завершена" }, { status: 400 });
  }

  const spec = getExamSpec(attempt.subjectKey);
  if (!spec?.hasEssayPhase) {
    return NextResponse.json({
      error: "У этого предмета нет фазы сочинения",
    }, { status: 400 });
  }

  if (attempt.phase === "essay") {
    // Идемпотентно — просто вернём OK
    return NextResponse.json({ ok: true, phase: "essay" });
  }

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { phase: "essay" },
  });

  return NextResponse.json({ ok: true, phase: "essay" });
}
