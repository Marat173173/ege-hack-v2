/**
 * GET /api/exam/attempt/[attemptId]/result
 *
 * Возвращает отчёт по УЖЕ финализированной попытке (не меняет БД).
 * Формат ответа совпадает с POST /api/exam/finalize — используется страницей
 * результата при повторном заходе, чтобы не дёргать finalize ещё раз.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";
import { getExamSpec } from "@/data/exam-specs";
import { FIPI_RU } from "@/data/fipi-codifier-ru";
import { FIPI_SOCIAL } from "@/data/fipi-codifier-social";
import { FIPI_HISTORY } from "@/data/fipi-codifier-history";
import { FIPI_MATH } from "@/data/fipi-codifier-math";
import { FIPI_MATH_BASE } from "@/data/fipi-codifier-math-base";
import { FIPI_PHYSICS } from "@/data/fipi-codifier-physics";
import { FIPI_LITERATURE } from "@/data/fipi-codifier-literature";
import { FIPI_ENGLISH } from "@/data/fipi-codifier-english";

export const runtime = "nodejs";

/** Кодификатор конкретного предмета по его subject.key. */
const CODIFIER_BY_SUBJECT: Record<string, Array<{ code: string; title: string }>> = {
  russian: FIPI_RU,
  "social-multi": FIPI_SOCIAL,
  "history-multi": FIPI_HISTORY,
  "math-multi": FIPI_MATH,
  "math-base-multi": FIPI_MATH_BASE,
  "physics-multi": FIPI_PHYSICS,
  "literature-multi": FIPI_LITERATURE,
  "english-multi": FIPI_ENGLISH,
};

/**
 * Ищет человекочитаемое название темы по её коду В КОНТЕКСТЕ ПРЕДМЕТА.
 * Одинаковые коды типа "1.1" есть в разных предметах — subjectKey защищает от путаницы.
 */
function resolveTopicTitle(topicId: string, subjectKey: string): string {
  const codifier = CODIFIER_BY_SUBJECT[subjectKey];
  if (!codifier) return topicId;

  // topicId для русского — просто "3.7.6", для остальных — "social-1.3" и т.п.
  const withoutPrefix = topicId.includes("-") ? topicId.replace(/^[a-z-]+?-/, "") : topicId;

  const found = codifier.find((t) => t.code === withoutPrefix);
  return found?.title ?? topicId;
}

export async function GET(
  _req: Request,
  { params }: { params: { attemptId: string } }
) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: params.attemptId },
    include: { answers: true },
  });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Попытка не найдена" }, { status: 404 });
  }
  if (attempt.status !== "finished") {
    return NextResponse.json({ error: "Попытка ещё не завершена" }, { status: 400 });
  }

  const spec = getExamSpec(attempt.subjectKey);
  if (!spec) return NextResponse.json({ error: "Спецификация не найдена" }, { status: 500 });

  const variant = attempt.variant as unknown as Array<{
    taskNumber: number;
    taskDbId: string;
    primaryScore: number;
    topicId: string;
    correct: number;
  }>;

  const userAnswers = new Map<number, number | null>();
  for (const a of attempt.answers) userAnswers.set(a.taskNumber, a.answer);

  const weakTopics = new Map<string, { total: number; correct: number }>();
  const details = [];

  for (const v of variant) {
    const userAnswer = userAnswers.get(v.taskNumber) ?? null;
    const isCorrect = userAnswer === v.correct;

    const bucket = weakTopics.get(v.topicId) ?? { total: 0, correct: 0 };
    bucket.total += 1;
    if (isCorrect) bucket.correct += 1;
    weakTopics.set(v.topicId, bucket);

    const task = await prisma.task.findUnique({ where: { id: v.taskDbId } });
    let question = "", options: string[] = [], explanation = "";
    if (task) {
      try {
        const parsed = JSON.parse(task.body) as { question: string; options: string[]; correct: number };
        question = parsed.question;
        options = parsed.options;
      } catch {/* ignore */}
      explanation = task.explanation ?? "";
    }

    details.push({
      taskNumber: v.taskNumber,
      question,
      options,
      correctAnswer: v.correct,
      userAnswer,
      isCorrect,
      primaryScore: v.primaryScore,
      earnedScore: isCorrect ? v.primaryScore : 0,
      explanation,
      topicId: v.topicId,
    });
  }

  const weakTopicsList = Array.from(weakTopics.entries())
    .filter(([, s]) => s.total > 0 && s.correct / s.total < 0.5)
    .map(([topicId, s]) => ({
      topicId,
      title: resolveTopicTitle(topicId, attempt.subjectKey),
      ratio: s.correct / s.total,
    }));

  return NextResponse.json({
    attemptId: attempt.id,
    subjectKey: attempt.subjectKey,
    displayName: spec.displayName,
    primaryScore: attempt.primaryScore ?? 0,
    maxPrimaryScore: attempt.maxPrimaryScore,
    testScorePart1: attempt.testScorePart1 ?? 0,
    forecast: {
      min: attempt.forecastMin ?? 0,
      expected: attempt.forecastExpected ?? 0,
      max: attempt.forecastMax ?? 0,
    },
    secondsSpent: attempt.secondsSpent ?? 0,
    weakTopics: weakTopicsList,
    details,
  });
}
