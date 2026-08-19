-- ============================================================
-- Миграция 09: Полный ЕГЭ для русского языка (тесты + сочинение)
-- ============================================================
--
-- Новые поля в ExamAttempt:
--   phase                — "tests" | "essay" | "finished"
--   essayTextId          — какой из 12 текстов достался в этом варианте
--   essayContent         — сочинение ученика (после написания)
--   essayReview          — разбор Claude по К1-К12 (JSON)
--   essayScore           — балл за сочинение (0-25)
--   overtimeSeconds      — на сколько секунд превысил лимит времени
--   factualScore         — балл, засчитывая только то что успел ДО звонка
--   conditionalScore     — балл, засчитывая всё что решено (даже после звонка)
--
-- Новое поле в ExamAnswer:
--   elapsedSecondsAtAnswer — время от старта до этого ответа (без пауз)
--
-- Выполнить в Postgres Console:
--   psql $DATABASE_URL, потом вставить SQL
-- ============================================================

ALTER TABLE "ExamAttempt"
  ADD COLUMN IF NOT EXISTS "phase"            TEXT NOT NULL DEFAULT 'tests',
  ADD COLUMN IF NOT EXISTS "essayTextId"      TEXT,
  ADD COLUMN IF NOT EXISTS "essayContent"     TEXT,
  ADD COLUMN IF NOT EXISTS "essayReview"      JSONB,
  ADD COLUMN IF NOT EXISTS "essayScore"       INTEGER,
  ADD COLUMN IF NOT EXISTS "overtimeSeconds"  INTEGER,
  ADD COLUMN IF NOT EXISTS "factualScore"     INTEGER,
  ADD COLUMN IF NOT EXISTS "conditionalScore" INTEGER;

-- FK на EssayText — но не CASCADE (тексты редко удаляют, лучше просто ошибка)
ALTER TABLE "ExamAttempt"
  ADD CONSTRAINT "ExamAttempt_essayTextId_fkey"
    FOREIGN KEY ("essayTextId") REFERENCES "EssayText"("id") ON DELETE SET NULL;

ALTER TABLE "ExamAnswer"
  ADD COLUMN IF NOT EXISTS "elapsedSecondsAtAnswer" INTEGER;

-- Проверка
SELECT column_name FROM information_schema.columns
WHERE table_name = 'ExamAttempt' AND column_name IN
  ('phase','essayTextId','essayContent','essayReview','essayScore','overtimeSeconds','factualScore','conditionalScore')
ORDER BY column_name;
