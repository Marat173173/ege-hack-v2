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
import type { MistakeItem } from "@/components/screens/ResultsScreen";

export type { MistakeItem };

const apiKey = process.env.POLZA_API_KEY;
const baseURL = process.env.POLZA_BASE_URL || "https://polza.ai/api/v1";
const MODEL = process.env.POLZA_MODEL || "anthropic/claude-haiku-4-5";

const client = apiKey ? new OpenAI({ apiKey, baseURL }) : null;

/** Промпт «опытный репетитор ЕГЭ». Краткий, без излишеств. */
function buildSystemPrompt(mode?: "review"): string {
  const base = `Ты — внимательный репетитор для подготовки к ЕГЭ. Отвечаешь школьникам 10–11 класса.

Принципы:
1. Опирайся на материалы из <контекст>. Если в нём нет ответа — честно скажи, что не уверен, и предложи задать вопрос точнее.
2. Объясняй по-человечески: коротко, с примером, без занудства. Не лей воды.
3. Если ученик не понял — переформулируй, разбери на пальцах.
4. Никогда не выдумывай факты и не путай правила. Лучше «не знаю», чем неправильный ответ.
5. Отвечай на русском.

Формат ответа: 2–6 предложений простой прозой. Если нужно — пронумерованный список из 2–4 пунктов. Никаких больших заголовков.`;

  if (mode !== "review") return base;

  return `${base}

Ты разбираешь ошибки конкретной тренировки ученика (см. <ошибки_сессии>). Пройдись по каждой: почему ошибся, как рассуждать верно, дай мини-приём запоминания. Тон — поддерживающий, обращение на ты, структурируй по ошибкам, в конце предложи потренировать слабое место.`;
}

/** Собирает контекст из найденных чанков в читаемый блок для модели. */
function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "<контекст>пусто</контекст>";

  const items = chunks.map((c, i) => `[${i + 1}] ${c.title}\n${c.text}`);
  return `<контекст>\n${items.join("\n\n")}\n</контекст>`;
}

/** Максимум ошибок, которые попадают в промпт целиком. */
const MAX_MISTAKES_SHOWN = 6;

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;
}

/** Собирает ошибки тренировки в читаемый блок для модели (в стиле buildContextBlock). */
function buildMistakesBlock(mistakes: MistakeItem[]): string {
  if (mistakes.length === 0) return "";

  const shown = mistakes.slice(0, MAX_MISTAKES_SHOWN);
  const items = shown.map(
    (m, i) =>
      `[${i + 1}] Тема ${m.code}\n` +
      `Вопрос: ${truncate(m.question, 300)}\n` +
      `Ответ ученика: ${truncate(m.your, 160)}\n` +
      `Верный ответ: ${truncate(m.answer, 160)}\n` +
      `Разбор: ${truncate(m.hint, 300)}`
  );

  const rest = mistakes.length - shown.length;
  if (rest > 0) items.push(`…и ещё ${rest}.`);

  return `<ошибки_сессии>\n${items.join("\n\n")}\n</ошибки_сессии>`;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AnswerOptions = {
  mistakes?: MistakeItem[];
  mode?: "review";
};

/**
 * Получить ответ от LLM с RAG-контекстом.
 * При mode="review" модель разбирает ошибки тренировки из opts.mistakes.
 */
export async function answer(
  question: string,
  chunks: RetrievedChunk[],
  history: ChatTurn[] = [],
  opts: AnswerOptions = {}
): Promise<string> {
  const mistakes = opts.mistakes ?? [];

  if (!client) {
    // Заглушка для разработки без API-ключа
    if (opts.mode === "review" && mistakes.length > 0) {
      const codes = [...new Set(mistakes.map((m) => m.code))];
      return [
        "⚠️ POLZA_API_KEY не задан — отвечаю заглушкой.",
        "",
        `Разбираю тренировку: ${mistakes.length} ошибок по темам ${codes.join(", ")}.`,
        "Повтори эти темы по кодификатору и потренируй слабые места ещё раз.",
      ].join("\n");
    }

    return [
      "⚠️ POLZA_API_KEY не задан — отвечаю заглушкой.",
      "",
      `Вопрос: ${question}`,
      "",
      `Нашёл ${chunks.length} релевантных фрагментов:`,
      ...chunks.slice(0, 3).map((c, i) => `${i + 1}. ${c.title} (distance: ${c.distance.toFixed(3)})`),
    ].join("\n");
  }

  const blocks = [buildContextBlock(chunks), buildMistakesBlock(mistakes)].filter(Boolean);
  const userMessage = `${blocks.join("\n\n")}\n\nВопрос ученика: ${question}`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: buildSystemPrompt(opts.mode) },
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
