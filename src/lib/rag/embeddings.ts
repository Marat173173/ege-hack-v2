/**
 * Сервис эмбеддингов через Polza AI (OpenAI-совместимый API).
 *
 * Модель: openai/text-embedding-3-small — 1536-мерные векторы,
 * хорошее качество для русского и других языков.
 *
 * Стоимость: ~$0.02 за миллион токенов. Один типичный фрагмент
 * 100-300 слов ≈ 300 токенов ≈ $0.000006 ≈ 0.001 ₽. Копейки.
 *
 * Переменные окружения:
 *   POLZA_API_KEY        — общий ключ Polza (тот же, что для LLM)
 *   POLZA_EMBED_MODEL    — модель эмбеддингов (по умолчанию text-embedding-3-small)
 */

import OpenAI from "openai";

const apiKey = process.env.POLZA_API_KEY;
const baseURL = process.env.POLZA_BASE_URL || "https://polza.ai/api/v1";
const MODEL = process.env.POLZA_EMBED_MODEL || "openai/text-embedding-3-small";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!apiKey) {
    throw new Error(
      "POLZA_API_KEY не задан — невозможно создавать эмбеддинги. " +
      "Получи ключ на https://polza.ai/dashboard/api-keys"
    );
  }
  if (!client) client = new OpenAI({ apiKey, baseURL });
  return client;
}

/** Размерность эмбеддингов используемой модели. Важно для схемы БД. */
export const EMBEDDING_DIM = 1536;

/**
 * Возвращает эмбеддинг текста (вектор из 1536 чисел).
 * Polza/OpenAI уже возвращают L2-нормализованные векторы — готово для cosine similarity.
 */
export async function embed(text: string): Promise<number[]> {
  const response = await getClient().embeddings.create({
    model: MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Эмбеддинг сразу для массива. Polza поддерживает батчи нативно.
 * Существенно быстрее, чем по одному (один сетевой запрос вместо N).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const response = await getClient().embeddings.create({
    model: MODEL,
    input: texts,
  });
  // Сохраняем порядок по индексу на случай, если API его перемешает
  return response.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
