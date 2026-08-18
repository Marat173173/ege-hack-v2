/**
 * POST /api/exam/finalize
 * Body: { attemptId }
 *
 * Завершает попытку: подсчитывает баллы, сравнивая ответы с правильными
 * из variant JSON, обновляет статус, возвращает клиенту полный отчёт
 * с разбором каждого задания.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { currentUserId } from "@/lib/db/session";
import { primaryToTest, forecastTotalScore } from "@/lib/exam/score-tables";
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

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: { attemptId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "невалидный JSON" }, { status: 400 }); }

  const { attemptId } = body;
  if (!attemptId) return NextResponse.json({ error: "attemptId обязателен" }, { status: 400 });

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: true },
  });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Попытка не найдена" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "Попытка уже завершена" }, { status: 400 });
  }

  const variant = attempt.variant as unknown as Array<{
    taskNumber: number;
    taskDbId: string;
    primaryScore: number;
    topicId: string;
    correct: number;
  }>;

  const spec = getExamSpec(attempt.subjectKey);
  if (!spec) return NextResponse.json({ error: "Спецификация не найдена" }, { status: 500 });

  // Подготовим карту ответов ученика
  const userAnswers = new Map<number, number | null>();
  for (const a of attempt.answers) userAnswers.set(a.taskNumber, a.answer);

  // Считаем баллы и собираем отчёт
  let primaryScore = 0;
  const details = [];
  const weakTopics = new Map<string, { total: number; correct: number }>();

  for (const v of variant) {
    const userAnswer = userAnswers.get(v.taskNumber) ?? null;
    const isCorrect = userAnswer === v.correct;
    if (isCorrect) primaryScore += v.primaryScore;

    // Отслеживаем «слабые темы»
    const bucket = weakTopics.get(v.topicId) ?? { total: 0, correct: 0 };
    bucket.total += 1;
    if (isCorrect) bucket.correct += 1;
    weakTopics.set(v.topicId, bucket);

    // Достаём полное описание задания для клиента
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

  // Прогноз итогового балла
  const forecast = forecastTotalScore(
    attempt.subjectKey,
    primaryScore,
    attempt.maxPrimaryScore
  );
  const part1TestScore = primaryToTest(attempt.subjectKey, primaryScore);

  // Определяем слабые темы (меньше 50% правильных)
  const weakTopicsList = Array.from(weakTopics.entries())
    .filter(([_, s]) => s.total > 0 && s.correct / s.total < 0.5)
    .map(([topicId, s]) => ({
      topicId,
      title: resolveTopicTitle(topicId, attempt.subjectKey),
      ratio: s.correct / s.total,
    }));

  const finalizedAt = new Date();
  const secondsSpent = Math.round((finalizedAt.getTime() - attempt.startedAt.getTime()) / 1000);

  // Сохраняем итог
  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      status: "finished",
      finalizedAt,
      primaryScore,
      testScorePart1: part1TestScore,
      forecastMin: forecast.min,
      forecastExpected: forecast.expected,
      forecastMax: forecast.max,
      secondsSpent,
    },
  });

  return NextResponse.json({
    attemptId,
    subjectKey: attempt.subjectKey,
    displayName: spec.displayName,
    primaryScore,
    maxPrimaryScore: attempt.maxPrimaryScore,
    testScorePart1: part1TestScore,
    forecast,
    secondsSpent,
    weakTopics: weakTopicsList,
    details,
  });
}
