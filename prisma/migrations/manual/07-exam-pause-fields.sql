ALTER TABLE "ExamAttempt"
  ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pausedMillis" INTEGER NOT NULL DEFAULT 0;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'ExamAttempt' AND column_name IN ('pausedAt', 'pausedMillis');
