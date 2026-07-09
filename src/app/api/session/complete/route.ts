/**
 * POST /api/session/complete — сохранить результат сессии (тренировка/симуляция).
 *
 * Body: { anonId, floorId, subject, kind, correct, total, seconds, xp, mistakes }
 * Ответ: { ok: true, id } | 400 при мусоре | 500 при сбое.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isValidAnonId, readAnonId } from "@/lib/db/anon";

export const runtime = "nodejs";

const KINDS = ["train", "sim", "diagnostic"] as const;
const MAX_MISTAKES = 50;
const MAX_STR = 2000;

type MistakeItem = {
  code: string;
  question: string;
  your: string;
  answer: string;
  hint: string;
};

const cut = (s: string) => s.slice(0, MAX_STR);

const isCount = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0;

/** Возвращает нормализованный массив ошибок либо null, если формат не тот. */
function parseMistakes(raw: unknown): MistakeItem[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > MAX_MISTAKES) return null;

  const out: MistakeItem[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;
    const { code, question, your, answer, hint } = item as Record<string, unknown>;
    const fields = [code, question, your, answer, hint];
    if (!fields.every((f): f is string => typeof f === "string")) return null;
    out.push({
      code: cut(code as string),
      question: cut(question as string),
      your: cut(your as string),
      answer: cut(answer as string),
      hint: cut(hint as string),
    });
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Ожидается JSON-объект" }, { status: 400 });
    }

    const anonId = isValidAnonId(body.anonId) ? body.anonId : readAnonId(req);
    if (!anonId) {
      return NextResponse.json({ error: "anonId обязателен" }, { status: 400 });
    }

    const { floorId, subject, kind } = body;
    if (typeof floorId !== "string" || !floorId || floorId.length > 200) {
      return NextResponse.json({ error: "floorId обязателен" }, { status: 400 });
    }
    if (typeof subject !== "string" || !subject || subject.length > 200) {
      return NextResponse.json({ error: "subject обязателен" }, { status: 400 });
    }
    if (!KINDS.includes(kind as (typeof KINDS)[number])) {
      return NextResponse.json(
        { error: "kind должен быть train | sim | diagnostic" },
        { status: 400 }
      );
    }

    const { correct, total, seconds, xp } = body;
    if (!isCount(correct) || !isCount(total) || !isCount(seconds) || !isCount(xp)) {
      return NextResponse.json(
        { error: "correct, total, seconds, xp — конечные числа ≥ 0" },
        { status: 400 }
      );
    }

    const mistakes = parseMistakes(body.mistakes);
    if (!mistakes) {
      return NextResponse.json(
        { error: `mistakes — массив до ${MAX_MISTAKES} объектов {code, question, your, answer, hint}` },
        { status: 400 }
      );
    }

    const row = await prisma.sessionResult.create({
      data: {
        anonId,
        floorId,
        subject,
        kind: kind as string,
        correct: Math.round(correct),
        total: Math.round(total),
        seconds: Math.round(seconds),
        xp: Math.round(xp),
        mistakes,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    console.error("Session complete error:", err);
    return NextResponse.json(
      { error: "Ошибка сервера. Попробуй ещё раз через минуту." },
      { status: 500 }
    );
  }
}
