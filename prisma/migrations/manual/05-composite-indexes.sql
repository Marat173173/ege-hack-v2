-- ============================================================
-- Миграция: composite-индексы (Task, ChatMessage, TopicProgress)
-- ============================================================
--
-- С ростом базы одиночных индексов на полях не хватает — запросы,
-- фильтрующие/сортирующие сразу по двум столбцам, уходят в full scan.
--
-- ПОРЯДОК:
--   1. Открыть Railway → карточку Postgres → вкладка Data (или Console)
--   2. Вставить этот SQL и выполнить
--
-- Альтернатива — npx prisma db push на сервисе ege-hack-v2, НО:
-- db push может снести ivfflat-индекс knowledge_chunk_embedding_idx.
-- После push проверить и пересоздать его — SQL в manual/01.
-- ============================================================

-- Task: часто фильтруется по (exam, topicId)
CREATE INDEX IF NOT EXISTS "Task_exam_topicId_idx" ON "Task"("exam", "topicId");

-- ChatMessage: часто выбирается по sessionId с сортировкой по времени
CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_createdAt_idx"
    ON "ChatMessage"("sessionId", "createdAt" DESC);

-- TopicProgress: частый запрос "всё по юзеру"
CREATE INDEX IF NOT EXISTS "TopicProgress_userId_updatedAt_idx"
    ON "TopicProgress"("userId", "updatedAt" DESC);

-- Проверка
SELECT indexname FROM pg_indexes WHERE tablename IN ('Task', 'ChatMessage', 'TopicProgress');
