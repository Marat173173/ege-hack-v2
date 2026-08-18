-- ============================================================
-- Миграция 08: тренажёр сочинения по русскому (ЕГЭ задание 27)
-- ============================================================
--
-- EssayText   — банк исходных текстов (~12-15 штук)
-- EssayAttempt — попытка ученика написать сочинение + разбор
--
-- Разбор хранится как Json — там баллы по К1-К12, комментарии, рекомендации.
--
-- Выполнить в Postgres Console на Railway:
--   psql $DATABASE_URL, затем вставить SQL ниже
-- ============================================================

CREATE TABLE IF NOT EXISTS "EssayText" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "authorHint"  TEXT,
    "body"        TEXT NOT NULL,
    "problems"    JSONB NOT NULL,
    "difficulty"  INTEGER NOT NULL DEFAULT 2,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EssayText_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EssayText_difficulty_idx" ON "EssayText"("difficulty");

CREATE TABLE IF NOT EXISTS "EssayAttempt" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "textId"       TEXT NOT NULL,
    "content"      TEXT NOT NULL,
    "wordCount"    INTEGER NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'reviewing',
    "review"       JSONB,
    "totalScore"   INTEGER,
    "maxScore"     INTEGER NOT NULL DEFAULT 25,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt"   TIMESTAMP(3),
    CONSTRAINT "EssayAttempt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EssayAttempt_textId_fkey"
        FOREIGN KEY ("textId") REFERENCES "EssayText"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "EssayAttempt_userId_createdAt_idx"
    ON "EssayAttempt"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "EssayAttempt_textId_idx" ON "EssayAttempt"("textId");

-- Проверка
SELECT table_name, COUNT(*) as columns FROM information_schema.columns
WHERE table_name IN ('EssayText', 'EssayAttempt') GROUP BY table_name ORDER BY table_name;
