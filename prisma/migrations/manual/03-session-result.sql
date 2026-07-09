-- ============================================================
-- Миграция: таблица SessionResult (результаты сессий)
-- ============================================================
--
-- Хранит итоги тренировок/симуляций анонимных пользователей
-- (anonId из cookie/localStorage) до регистрации; userId — на
-- будущее для мержа с User.
--
-- ПОРЯДОК:
--   1. Открыть Railway → карточку Postgres → вкладка Data (или Console)
--   2. Вставить этот SQL и выполнить
--
-- Альтернатива — npx prisma db push на сервисе ege-hack-v2, НО:
-- db push может снести ivfflat-индекс knowledge_chunk_embedding_idx.
-- После push проверить и пересоздать его — SQL в manual/01.
-- ============================================================

CREATE TABLE IF NOT EXISTS "SessionResult" (
    "id"        TEXT NOT NULL,
    "anonId"    TEXT NOT NULL,
    "userId"    TEXT,
    "floorId"   TEXT NOT NULL,
    "subject"   TEXT NOT NULL,
    "kind"      TEXT NOT NULL,
    "correct"   INTEGER NOT NULL,
    "total"     INTEGER NOT NULL,
    "seconds"   INTEGER NOT NULL,
    "xp"        INTEGER NOT NULL,
    "mistakes"  JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SessionResult_anonId_createdAt_idx"
    ON "SessionResult"("anonId", "createdAt");

CREATE INDEX IF NOT EXISTS "SessionResult_anonId_floorId_idx"
    ON "SessionResult"("anonId", "floorId");

-- Проверка:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'SessionResult';
