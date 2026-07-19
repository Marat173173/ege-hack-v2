/**
 * POST /api/auth/link-anon
 *
 * Одноразовый мерж: переносит все результаты тренировок из SessionResult,
 * записанные под anonId, на текущего авторизованного пользователя.
 * Вызывается один раз сразу после успешного входа/регистрации.
 *
 * Body: { anonId: string }
 *
 * Идемпотентен: если userId уже проставлен, обновит только строки,
 * где он null. Повторный вызов ничего не сломает.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  let body: { anonId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "невалидный JSON" }, { status: 400 });
  }

  const anonId = body.anonId?.trim();
  if (!anonId) {
    return NextResponse.json({ error: "anonId обязателен" }, { status: 400 });
  }

  // UPDATE только по строкам без userId — чтобы повторный мерж
  // не переписал результаты, которые уже привязаны к чужому аккаунту.
  const result = await prisma.$executeRaw`
    UPDATE "SessionResult"
    SET "userId" = ${userId}
    WHERE "anonId" = ${anonId} AND "userId" IS NULL
  `;

  return NextResponse.json({ linked: result });
}
