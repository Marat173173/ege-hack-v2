-- ============================================================
-- Миграция 06: симулятор ЕГЭ (ExamAttempt + ExamAnswer)
-- ============================================================
--
-- Хранит попытки прохождения пробника ЕГЭ:
--   ExamAttempt — одна попытка (subject, время, баллы, вариант)
--   ExamAnswer  — ответ ученика на конкретное задание в этой попытке
--
-- Выполнить в Postgres Console на Railway:
--   psql $DATABASE_URL < этот_файл
-- ============================================================

CREATE TABLE IF NOT EXISTS "ExamAttempt" (
    "id"                   TEXT NOT NULL,
    "userId"               TEXT NOT NULL,
    "subjectKey"           TEXT NOT NULL,
    "durationMinutes"      INTEGER NOT NULL,
    "maxPrimaryScore"      INTEGER NOT NULL,
    "maxPrimaryScoreTotal" INTEGER NOT NULL,
    "variant"              JSONB NOT NULL,
    "status"               TEXT NOT NULL DEFAULT 'in_progress',
    "primaryScore"         INTEGER,
    "testScorePart1"       INTEGER,
    "forecastMin"          INTEGER,
    "forecastExpected"     INTEGER,
    "forecastMax"          INTEGER,
    "secondsSpent"         INTEGER,
    "startedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt"          TIMESTAMP(3),
    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExamAttempt_userId_finalizedAt_idx"
    ON "ExamAttempt"("userId", "finalizedAt" DESC);

CREATE INDEX IF NOT EXISTS "ExamAttempt_userId_subject_idx"
    ON "ExamAttempt"("userId", "subjectKey");

CREATE TABLE IF NOT EXISTS "ExamAnswer" (
    "id"         TEXT NOT NULL,
    "attemptId"  TEXT NOT NULL,
    "taskNumber" INTEGER NOT NULL,
    "answer"     INTEGER,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamAnswer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExamAnswer_attemptId_taskNumber_key" UNIQUE ("attemptId", "taskNumber"),
    CONSTRAINT "ExamAnswer_attemptId_fkey"
        FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ExamAnswer_attemptId_idx" ON "ExamAnswer"("attemptId");

-- Проверка
SELECT table_name, column_count FROM (
  SELECT table_name, COUNT(*) as column_count
  FROM information_schema.columns
  WHERE table_name IN ('ExamAttempt', 'ExamAnswer')
  GROUP BY table_name
) sub ORDER BY table_name;
