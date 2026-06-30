/**
 * LLM-клиент через Polza AI — российский OpenAI-совместимый агрегатор.
 *
 * Polza позволяет вызывать Claude из России без VPN и зарубежных карт.
 * API совместим с OpenAI SDK, поэтому используем именно его.
 *
 * Переменные окружения:
 *   POLZA_API_KEY  — ключ из polza.ai/dashboard/api-keys
 *   POLZA_MODEL    — id модели в формате "anthropic/claude-haiku-4-5",
 *                    "openai/gpt-4o-mini" и т.п. (по умолчанию Haiku 4.5)
 *
 * Если POLZA_API_KEY не задан — возвращается заглушка (для разработки
 * без оплаты, чтобы остальной код работал).
 */

import OpenAI from "openai";
import type { RetrievedChunk } from "./search";

const apiKey = process.env.POLZA_API_KEY;
const baseURL = process.env.POLZA_BASE_URL || "https://polza.ai/api/v1";
const MODEL = process.env.POLZA_MODEL || "anthropic/claude-haiku-4-5";

const client = apiKey ? new OpenAI({ apiKey, baseURL }) : null;

/** Промпт «опытный репетитор ЕГЭ». Краткий, без излишеств. */
function buildSystemPrompt(): string {
  return `Ты — внимательный репетитор для подготовки к ЕГЭ. Отвечаешь школьникам 10–11 класса.

Принципы:
1. Опирайся на материалы из <контекст>. Если в нём нет ответа — честно скажи, что не уверен, и предложи задать вопрос точнее.
2. Объясняй по-человечески: коротко, с примером, без занудства. Не лей воды.
3. Если ученик не понял — переформулируй, разбери на пальцах.
4. Никогда не выдумывай факты и не путай правила. Лучше «не знаю», чем неправильный ответ.
5. Отвечай на русском.

Формат ответа: 2–6 предложений простой прозой. Если нужно — пронумерованный список из 2–4 пунктов. Никаких больших заголовков.`;
}

/** Собирает контекст из найденных чанков в читаемый блок для модели. */
function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "<контекст>пусто</контекст>";

  const items = chunks.map((c, i) => `[${i + 1}] ${c.title}\n${c.text}`);
  return `<контекст>\n${items.join("\n\n")}\n</контекст>`;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Получить ответ от LLM с RAG-контекстом.
 */
export async function answer(
  question: string,
  chunks: RetrievedChunk[],
  history: ChatTurn[] = []
): Promise<string> {
  if (!client) {
    // Заглушка для разработки без API-ключа
    return [
      "⚠️ POLZA_API_KEY не задан — отвечаю заглушкой.",
      "",
      `Вопрос: ${question}`,
      "",
      `Нашёл ${chunks.length} релевантных фрагментов:`,
      ...chunks.slice(0, 3).map((c, i) => `${i + 1}. ${c.title} (distance: ${c.distance.toFixed(3)})`),
    ].join("\n");
  }

  const userMessage = `${buildContextBlock(chunks)}\n\nВопрос ученика: ${question}`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: buildSystemPrompt() },
    ...history.slice(-6),
    { role: "user", content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 800,
    messages,
  });

  return response.choices[0]?.message?.content || "Не удалось получить ответ.";
}
