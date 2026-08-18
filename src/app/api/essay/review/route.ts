/**
 * POST /api/essay/review
 * Body: { textId: string; content: string }
 *
 * Проверяет сочинение через Claude по К1-К12, сохраняет попытку в БД,
 * возвращает разбор.
 *
 * Особенности:
 *   - maxDuration: 60 сек (Claude на длинном сочинении может думать 30-45 сек)
 *   - Валидация: минимум 70 слов (иначе Claude не сможет ничего сказать)
 *   - Rate-limit: 5 проверок в час на юзера (Polza дорогой)
 *   - Идемпотентности НЕТ — каждое сохранение создаёт новую попытку
 *     (это фича: ученик может подать одно сочинение → проверить → доработать →
 *     проверить снова, сравнить результаты)
 */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  buildReviewPrompt,
  buildUserMessage,
  validateAndFixReview,
} from "@/lib/essay/review-prompt";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIN_WORDS = 70;
const MAX_WORDS = 800;

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Rate limit: 5 проверок в час на юзера (Claude дорогой)
  const rl = await checkRateLimit(req, {
    identifier: `essay-review:${userId}`,
    limit: 5,
    window: "1 h",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Слишком много проверок. Подожди час — Claude не резиновый." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: { textId?: string; content?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "невалидный JSON" }, { status: 400 });
  }

  const { textId, content } = body;
  if (!textId) return NextResponse.json({ error: "textId обязателен" }, { status: 400 });
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "content обязателен" }, { status: 400 });
  }

  const trimmed = content.trim();
  const wordCount = trimmed.split(/\s+/).filter((w) => w.length > 0).length;

  if (wordCount < MIN_WORDS) {
    return NextResponse.json({
      error: `Слишком короткое сочинение (${wordCount} слов). Минимум для проверки — ${MIN_WORDS}.`,
    }, { status: 400 });
  }
  if (wordCount > MAX_WORDS) {
    return NextResponse.json({
      error: `Слишком длинное сочинение (${wordCount} слов). Максимум ${MAX_WORDS} слов — на ЕГЭ уходят баллы за многословие.`,
    }, { status: 400 });
  }

  // Получаем исходный текст
  const sourceText = await prisma.essayText.findUnique({ where: { id: textId } });
  if (!sourceText) return NextResponse.json({ error: "Исходный текст не найден" }, { status: 404 });

  // Записываем попытку сразу — на случай, если Claude упадёт, ученик увидит её в истории
  const attempt = await prisma.essayAttempt.create({
    data: {
      userId,
      textId,
      content: trimmed,
      wordCount,
      status: "reviewing",
    },
  });

  // Идём в Claude через Polza
  if (!process.env.POLZA_API_KEY) {
    return NextResponse.json({ error: "POLZA_API_KEY не настроен" }, { status: 500 });
  }

  const client = new OpenAI({
    apiKey: process.env.POLZA_API_KEY,
    baseURL: process.env.POLZA_BASE_URL || "https://polza.ai/api/v1",
  });

  const model = process.env.POLZA_MODEL || "anthropic/claude-haiku-4.5";

  try {
    const resp = await client.chat.completions.create({
      model,
      max_tokens: 4000,
      messages: [
        { role: "system", content: buildReviewPrompt() },
        {
          role: "user",
          content: buildUserMessage(
            {
              body: sourceText.body,
              problems: sourceText.problems as string[],
            },
            trimmed
          ),
        },
      ],
    });

    const raw = (resp.choices[0]?.message?.content || "").replace(/```json\s*|\s*```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Модель вернула невалидный JSON");
    }

    const review = validateAndFixReview(parsed);
    if (!review) throw new Error("Не удалось прочитать разбор");

    // Обновляем попытку
    await prisma.essayAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "reviewed",
        review: review as unknown as Prisma.InputJsonValue,
        totalScore: review.totalScore,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({
      attemptId: attempt.id,
      review,
    });
  } catch (err) {
    // Помечаем попытку как ошибочную
    await prisma.essayAttempt.update({
      where: { id: attempt.id },
      data: { status: "failed" },
    }).catch(() => {/* ignore */});

    console.error("[essay/review]", err);
    return NextResponse.json(
      { error: `Не удалось проверить сочинение: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
