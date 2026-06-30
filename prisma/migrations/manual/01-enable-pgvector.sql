-- ============================================================
-- Включение pgvector в Postgres на Railway
-- ============================================================
--
-- Выполнить ОДИН РАЗ в Console Railway (PostgreSQL → Console)
-- или в Database → раздел Data: вставить и Run.
--
-- ПОРЯДОК:
--   1. Открыть Railway → карточку Postgres → вкладка Data (или Console)
--   2. Вставить эту SQL-команду и выполнить
--   3. Только потом запускать на ege-hack-v2: npx prisma db push
--
-- Если получишь ошибку "could not open extension control file" —
-- значит расширение не установлено в Postgres-образе. Railway
-- по умолчанию поддерживает pgvector. Если нет — пиши, поищем
-- альтернативный путь.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Проверка:
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- После prisma db push нужно ещё создать индекс для ускорения поиска
-- (выполнить ПОСЛЕ того, как таблица KnowledgeChunk появилась):
--
-- CREATE INDEX IF NOT EXISTS knowledge_chunk_embedding_idx
-- ON "KnowledgeChunk" USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);
