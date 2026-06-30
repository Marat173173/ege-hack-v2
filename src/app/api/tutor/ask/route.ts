/**
 * POST /api/tutor/ask — задать вопрос ИИ-репетитору.
 *
 * Принимает: { question: string, subject?: string, history?: ChatTurn[] }
 * Возвращает: { answer: string, sources: {id, title, distance}[] }
 *
 * Анонимные запросы поддерживаются (для лендинга и пробных вопросов).
 * Авторизованные запросы можно сохранять в ChatSession (будущая фича).
 */

import { NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/rag/search";
import { answer, type ChatTurn } from "@/lib/rag/llm";

// Этот роут грузит модель эмбеддингов — оставим его на Node runtime,
// не на Edge (Edge не поддерживает Transformers.js).
export const runtime = "nodejs";
export const maxDuration = 30; // секунд

export async function POST(req: Request) {
  try {
    const { question, subject, history } = (await req.json()) as {
      question: string;
      subject?: string;
      history?: ChatTurn[];
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
    const reply = await answer(question.trim(), chunks, history || []);

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
