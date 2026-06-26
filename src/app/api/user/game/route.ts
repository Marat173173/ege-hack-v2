import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

/** GET /api/user/game — получить GameState. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const game = await prisma.gameState.findUnique({ where: { userId } });
  if (!game) return NextResponse.json({ error: "GameState не найден" }, { status: 404 });

  return NextResponse.json(game);
}

/** PATCH /api/user/game — обновить GameState. */
export async function PATCH(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json();

  const allowed = ["xp", "dailyXp", "dailyGoal", "streak", "lastActiveDay", "combo", "bestCombo"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const game = await prisma.gameState.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  return NextResponse.json(game);
}
