-- ============================================================
-- Миграция: таблица LinkedAnonId (защита /api/auth/link-anon)
-- ============================================================
--
-- Каждый anonId можно привязать к аккаунту только один раз.
-- Без этого endpoint принимал любой anonId от клиента и переписывал
-- SessionResult.userId — зная/подобрав чужой anonId, можно было
-- угнать чужую тренировочную историю.
--
-- ПОРЯДОК:
--   1. Открыть Railway → карточку Postgres → вкладка Data (или Console)
--   2. Вставить этот SQL и выполнить
--
-- Альтернатива — npx prisma db push на сервисе ege-hack-v2, НО:
-- db push может снести ivfflat-индекс knowledge_chunk_embedding_idx.
-- После push проверить и пересоздать его — SQL в manual/01.
-- ============================================================

CREATE TABLE IF NOT EXISTS "LinkedAnonId" (
    "anonId"   TEXT NOT NULL,
    "userId"   TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LinkedAnonId_pkey" PRIMARY KEY ("anonId")
);
CREATE INDEX IF NOT EXISTS "LinkedAnonId_userId_idx" ON "LinkedAnonId"("userId");

-- Проверка:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'LinkedAnonId';
