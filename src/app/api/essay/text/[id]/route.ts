/**
 * GET /api/essay/text/[id]
 *
 * Возвращает один исходный текст целиком, с телом.
 * Используется на странице сочинения — ученику надо видеть текст полностью.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const text = await prisma.essayText.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      authorHint: true,
      body: true,
      problems: true,
      difficulty: true,
    },
  });

  if (!text) return NextResponse.json({ error: "Текст не найден" }, { status: 404 });

  return NextResponse.json({ text });
}
