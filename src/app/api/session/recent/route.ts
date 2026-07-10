/**
 * GET /api/session/recent?anonId=&floorId=&limit=10 — последние сессии.
 *
 * Ответ: { sessions: [{ id, floorId, kind, correct, total, seconds, xp,
 *   mistakes, createdAt }] } — createdAt в ISO, свежие первыми.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { readAnonId } from "@/lib/db/anon";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const anonId = readAnonId(req);
    if (!anonId) {
      return NextResponse.json({ error: "anonId обязателен" }, { status: 400 });
    }

    const url = new URL(req.url);
    const floorId = url.searchParams.get("floorId");
    const rawLimit = parseInt(url.searchParams.get("limit") ?? "10", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 10;

    const rows = await prisma.sessionResult.findMany({
      where: { anonId, ...(floorId ? { floorId } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        floorId: true,
        kind: true,
        correct: true,
        total: true,
        seconds: true,
        xp: true,
        mistakes: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      sessions: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
  } catch (err) {
    console.error("Session recent error:", err);
    return NextResponse.json(
      { error: "Ошибка сервера. Попробуй ещё раз через минуту." },
      { status: 500 }
    );
  }
}
