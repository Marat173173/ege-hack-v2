/**
 * Векторный поиск похожих фрагментов знания через pgvector.
 *
 * Используем raw SQL: Prisma не умеет работать с vector нативно,
 * но pgvector поставил оператор <=> для cosine distance.
 */

import { prisma } from "@/lib/db/prisma";
import { embed } from "./embeddings";

export type RetrievedChunk = {
  id: string;
  title: string;
  text: string;
  subject: string;
  topicId: string | null;
  topicCode: string | null;
  kind: string;
  distance: number; // 0 = идеальное совпадение, 2 = противоположность
};

/**
 * Превращает массив чисел в литерал для pgvector: '[0.1,0.2,...]'.
 * Так SQL понимает, что это vector.
 */
function toVectorLiteral(arr: number[]): string {
  return `[${arr.join(",")}]`;
}

/**
 * Ищет topK самых релевантных фрагментов для запроса.
 *
 * @param query текст вопроса от пользователя
 * @param topK сколько вернуть (обычно 4-8)
 * @param subject если задан — фильтр по предмету
 */
export async function searchKnowledge(
  query: string,
  topK = 6,
  subject?: string
): Promise<RetrievedChunk[]> {
  const queryVector = await embed(query);
  const vectorLit = toVectorLiteral(queryVector);

  // Используем оператор <=> (cosine distance) и приводим тип через ::vector
  const rows = subject
    ? await prisma.$queryRaw<RetrievedChunk[]>`
        SELECT id, title, text, subject, "topicId", "topicCode", kind,
               (embedding <=> ${vectorLit}::vector) AS distance
        FROM "KnowledgeChunk"
        WHERE embedding IS NOT NULL AND subject = ${subject}
        ORDER BY embedding <=> ${vectorLit}::vector
        LIMIT ${topK}
      `
    : await prisma.$queryRaw<RetrievedChunk[]>`
        SELECT id, title, text, subject, "topicId", "topicCode", kind,
               (embedding <=> ${vectorLit}::vector) AS distance
        FROM "KnowledgeChunk"
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorLit}::vector
        LIMIT ${topK}
      `;

  return rows;
}

/**
 * Сохраняет чанк с эмбеддингом. Raw SQL — Prisma не поддерживает vector нативно.
 */
export async function upsertChunk(opts: {
  id?: string;
  subject: string;
  topicId?: string | null;
  topicCode?: string | null;
  kind: string;
  source: string;
  title: string;
  text: string;
  embedding: number[];
}): Promise<string> {
  const id = opts.id ?? generateId();
  const vectorLit = toVectorLiteral(opts.embedding);

  await prisma.$executeRaw`
    INSERT INTO "KnowledgeChunk"
      (id, subject, "topicId", "topicCode", kind, source, title, text, embedding, "createdAt", "updatedAt")
    VALUES
      (${id}, ${opts.subject}, ${opts.topicId ?? null}, ${opts.topicCode ?? null},
       ${opts.kind}, ${opts.source}, ${opts.title}, ${opts.text},
       ${vectorLit}::vector, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      text = EXCLUDED.text,
      embedding = EXCLUDED.embedding,
      "updatedAt" = NOW()
  `;

  return id;
}

/** Простой ID-генератор (cuid-подобный, не зависит от dnspromises). */
function generateId(): string {
  return "c" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
