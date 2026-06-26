import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";

/** GET /api/user/progress — все темы пользователя. */
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const rows = await prisma.topicProgress.findMany({ where: { userId } });
  return NextResponse.json(rows);
}

/**
 * PUT /api/user/progress — обновить прогресс по теме.
 * Body: { topicId: string, prog: number, stab: number }
 */
export async function PUT(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const { topicId, prog, stab } = await req.json();

  if (!topicId || typeof prog !== "number" || typeof stab !== "number") {
    return NextResponse.json({ error: "topicId, prog, stab обязательны" }, { status: 400 });
  }

  const row = await prisma.topicProgress.upsert({
    where: { userId_topicId: { userId, topicId } },
    update: {
      prog: Math.min(100, Math.max(0, prog)),
      stab: Math.min(100, Math.max(0, stab)),
    },
    create: {
      userId,
      topicId,
      prog: Math.min(100, Math.max(0, prog)),
      stab: Math.min(100, Math.max(0, stab)),
    },
  });

  return NextResponse.json(row);
}

/**
 * POST /api/user/progress — массовое сохранение (синхронизация при выходе).
 * Body: [{ topicId, prog, stab }, ...]
 */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const items: { topicId: string; prog: number; stab: number }[] = await req.json();

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "Ожидается массив" }, { status: 400 });
  }

  const results = await prisma.$transaction(
    items.map((item) =>
      prisma.topicProgress.upsert({
        where: { userId_topicId: { userId, topicId: item.topicId } },
        update: {
          prog: Math.min(100, Math.max(0, item.prog)),
          stab: Math.min(100, Math.max(0, item.stab)),
        },
        create: {
          userId,
          topicId: item.topicId,
          prog: Math.min(100, Math.max(0, item.prog)),
          stab: Math.min(100, Math.max(0, item.stab)),
        },
      })
    )
  );

  return NextResponse.json({ synced: results.length });
}
