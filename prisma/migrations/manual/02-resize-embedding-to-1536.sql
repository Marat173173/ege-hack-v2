-- ============================================================
-- Миграция: смена размерности эмбеддингов с 384 на 1536
-- ============================================================
--
-- Причина: перешли с локальной модели MiniLM (384) на
-- OpenAI text-embedding-3-small через Polza AI (1536).
-- Старые данные удаляем — их там нет (индексация не прошла).
--
-- ПОРЯДОК:
--   1. Выполнить этот SQL в Postgres Console на Railway
--   2. Затем на сервисе ege-hack-v2 выполнить: npx prisma db push
--   3. Затем переиндексировать: npm run rag:index
-- ============================================================

-- 1. Удаляем старый индекс (если был)
DROP INDEX IF EXISTS knowledge_chunk_embedding_idx;

-- 2. Удаляем старую колонку embedding
ALTER TABLE "KnowledgeChunk" DROP COLUMN IF EXISTS embedding;

-- 3. Создаём колонку нужной размерности (1536 для text-embedding-3-small)
ALTER TABLE "KnowledgeChunk" ADD COLUMN embedding vector(1536);

-- 4. Проверяем
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'KnowledgeChunk' AND column_name = 'embedding';

-- 5. Индекс создаём ПОСЛЕ первой индексации (когда есть данные):
-- CREATE INDEX IF NOT EXISTS knowledge_chunk_embedding_idx
-- ON "KnowledgeChunk" USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);
