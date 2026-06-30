/**
 * Клиент Anthropic API + системный промпт ИИ-репетитора.
 *
 * Ключ берётся из ANTHROPIC_API_KEY. Если ключа нет — функция answer()
 * вернёт заглушку, чтобы остальной код работал без оплаты на этапе разработки.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { RetrievedChunk } from "./search";

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

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
 *
 * @param question текущий вопрос пользователя
 * @param chunks найденные релевантные фрагменты
 * @param history предыдущие сообщения в этом разговоре (опционально)
 */
export async function answer(
  question: string,
  chunks: RetrievedChunk[],
  history: ChatTurn[] = []
): Promise<string> {
  if (!client) {
    // Заглушка для разработки без API-ключа
    return [
      "⚠️ ANTHROPIC_API_KEY не задан — отвечаю заглушкой.",
      "",
      `Вопрос: ${question}`,
      "",
      `Нашёл ${chunks.length} релевантных фрагментов:`,
      ...chunks.slice(0, 3).map((c, i) => `${i + 1}. ${c.title} (distance: ${c.distance.toFixed(3)})`),
    ].join("\n");
  }

  const userMessage = `${buildContextBlock(chunks)}\n\nВопрос ученика: ${question}`;

  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...history.slice(-6), // последние 3 пары — экономим токены
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: buildSystemPrompt(),
    messages,
  });

  const block = response.content.find((b) => b.type === "text");
  return block && "text" in block ? block.text : "Не удалось получить ответ.";
}
