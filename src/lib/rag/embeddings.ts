/**
 * Локальный сервис эмбеддингов на Transformers.js.
 *
 * Модель: paraphrase-multilingual-MiniLM-L12-v2 — 384-мерные векторы,
 * поддерживает русский язык, ~120 МБ.
 *
 * Модель кэшируется на диск при первом запуске и потом загружается
 * мгновенно из кэша. На Railway кэш сохраняется между перезапусками
 * контейнера.
 */

import { pipeline, env, type FeatureExtractionPipeline } from "@xenova/transformers";

// Кэшируем модель в /tmp на Railway (доступно для записи)
env.cacheDir = process.env.TRANSFORMERS_CACHE || "/tmp/transformers-cache";

let extractor: FeatureExtractionPipeline | null = null;
let loadingPromise: Promise<FeatureExtractionPipeline> | null = null;

/** Лениво загружает модель один раз, потом возвращает кэш. */
async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractor) return extractor;
  if (loadingPromise) return loadingPromise;

  loadingPromise = pipeline(
    "feature-extraction",
    "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
  ) as Promise<FeatureExtractionPipeline>;

  extractor = await loadingPromise;
  return extractor;
}

/**
 * Возвращает эмбеддинг текста (вектор из 384 чисел).
 * Mean pooling + L2-нормализация — стандарт для cosine similarity.
 */
export async function embed(text: string): Promise<number[]> {
  const model = await getExtractor();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

/** Эмбеддинг сразу для массива (последовательно, чтобы не съесть память). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const t of texts) {
    results.push(await embed(t));
  }
  return results;
}
