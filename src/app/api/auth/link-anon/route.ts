/**
 * POST /api/auth/link-anon
 *
 * Одноразовый мерж: переносит результаты тренировок из SessionResult,
 * записанные под anonId, на текущего авторизованного пользователя.
 * Вызывается один раз сразу после успешного входа/регистрации.
 *
 * Body: { anonId: string }
 *
 * Каждый anonId привязывается ровно к одному userId (таблица LinkedAnonId) —
 * иначе клиент мог прислать чужой anonId и угнать чужую тренировочную
 * историю. Мержим только SessionResult за последние 24 часа: свежая
 * анонимка перед регистрацией — это ожидаемый сценарий, а не чужие данные
 * многолетней давности.
 *
 * Идемпотентен: повторный вызов с уже привязанным на этого же юзера
 * anonId ничего не ломает (просто не находит новых строк).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

export const runtime = "nodejs";

const MIN_ANON_ID_LEN = 8;
const MAX_ANON_ID_LEN = 128;

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
  if (!anonId || anonId.length < MIN_ANON_ID_LEN || anonId.length > MAX_ANON_ID_LEN) {
    return NextResponse.json({ error: "anonId обязателен" }, { status: 400 });
  }

  const existing = await prisma.linkedAnonId.findUnique({ where: { anonId } });
  if (existing && existing.userId !== userId) {
    // Не сообщаем, кому принадлежит anonId — просто отказываем.
    return NextResponse.json({ linked: 0, reason: "already-linked" });
  }

  const [, updated] = await prisma.$transaction([
    prisma.linkedAnonId.upsert({
      where: { anonId },
      update: {},
      create: { anonId, userId },
    }),
    prisma.$executeRaw`
      UPDATE "SessionResult"
      SET "userId" = ${userId}
      WHERE "anonId" = ${anonId}
        AND "userId" IS NULL
        AND "createdAt" >= NOW() - INTERVAL '24 hours'
    `,
  ]);

  return NextResponse.json({ linked: updated });
}
