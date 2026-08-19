/**
 * POST /api/exam/essay-draft
 * Body: { attemptId, content }
 *
 * Сохраняет черновик сочинения в ExamAttempt.essayContent.
 * Клиент вызывает при автосохранении (каждые 3-5 сек).
 * Финальное сохранение будет в /api/exam/finalize.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: { attemptId?: string; content?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "невалидный JSON" }, { status: 400 });
  }

  const { attemptId, content } = body;
  if (!attemptId || typeof content !== "string") {
    return NextResponse.json({ error: "attemptId и content обязательны" }, { status: 400 });
  }
  if (content.length > 20000) {
    return NextResponse.json({ error: "Слишком длинный текст" }, { status: 400 });
  }

  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Попытка не найдена" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "Попытка уже завершена" }, { status: 400 });
  }

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { essayContent: content },
  });

  return NextResponse.json({ ok: true });
}
