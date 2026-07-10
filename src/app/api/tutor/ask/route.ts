/**
 * POST /api/tutor/ask — задать вопрос ИИ-репетитору.
 *
 * Принимает: { question: string, subject?: string, history?: ChatTurn[],
 *              mistakes?: MistakeItem[], mode?: "review" }
 * Возвращает: { answer: string, sources: {id, title, distance}[] }
 *
 * mode="review" + mistakes — разбор ошибок конкретной тренировки.
 *
 * Анонимные запросы поддерживаются (для лендинга и пробных вопросов).
 * Авторизованные запросы можно сохранять в ChatSession (будущая фича).
 */

import { NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/rag/search";
import { answer, type ChatTurn, type MistakeItem } from "@/lib/rag/llm";

// Этот роут грузит модель эмбеддингов — оставим его на Node runtime,
// не на Edge (Edge не поддерживает Transformers.js).
export const runtime = "nodejs";
export const maxDuration = 30; // секунд

const MAX_MISTAKES = 20;
const MAX_MISTAKE_FIELD = 1500;

/** Пропускает только валидные MistakeItem, отбрасывая лишние поля и элементы. */
function sanitizeMistakes(raw: unknown): MistakeItem[] {
  if (!Array.isArray(raw)) return [];

  const clean: MistakeItem[] = [];
  for (const item of raw.slice(0, MAX_MISTAKES)) {
    if (typeof item !== "object" || item === null) continue;
    const { code, question, your, answer, hint } = item as Record<string, unknown>;
    if (
      typeof code !== "string" ||
      typeof question !== "string" ||
      typeof your !== "string" ||
      typeof answer !== "string" ||
      typeof hint !== "string"
    ) {
      continue;
    }
    clean.push({
      code: code.slice(0, MAX_MISTAKE_FIELD),
      question: question.slice(0, MAX_MISTAKE_FIELD),
      your: your.slice(0, MAX_MISTAKE_FIELD),
      answer: answer.slice(0, MAX_MISTAKE_FIELD),
      hint: hint.slice(0, MAX_MISTAKE_FIELD),
    });
  }
  return clean;
}

export async function POST(req: Request) {
  try {
    const { question, subject, history, mistakes, mode } = (await req.json()) as {
      question: string;
      subject?: string;
      history?: ChatTurn[];
      mistakes?: unknown;
      mode?: unknown;
    };

    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return NextResponse.json(
        { error: "Вопрос должен быть строкой минимум 3 символа" },
        { status: 400 }
      );
    }

    if (question.length > 2000) {
      return NextResponse.json(
        { error: "Вопрос слишком длинный (макс. 2000 символов)" },
        { status: 400 }
      );
    }

    // 1. Найти релевантные фрагменты
    const chunks = await searchKnowledge(question.trim(), 6, subject);

    // 2. Сгенерировать ответ через LLM
    const reply = await answer(question.trim(), chunks, history || [], {
      mistakes: sanitizeMistakes(mistakes),
      mode: mode === "review" ? "review" : undefined,
    });

    // 3. Вернуть ответ + источники
    return NextResponse.json({
      answer: reply,
      sources: chunks.map((c) => ({
        id: c.id,
        title: c.title,
        distance: c.distance,
        topicCode: c.topicCode,
      })),
    });
  } catch (err) {
    console.error("Tutor ask error:", err);
    return NextResponse.json(
      { error: "Ошибка сервера. Попробуй ещё раз через минуту." },
      { status: 500 }
    );
  }
}
