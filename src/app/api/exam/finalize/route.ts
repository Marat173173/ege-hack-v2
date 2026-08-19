/**
 * POST /api/exam/finalize
 * Body: { attemptId, elapsedSeconds }
 *
 * Завершает попытку. Считает ДВА балла:
 *   - factualScore   — только ответы+сочинение до истечения времени
 *   - conditionalScore — всё что решено, включая после звонка
 *
 * Если у предмета hasEssayPhase и есть essayContent — вызывает проверку
 * через Claude, сохраняет разбор в essayReview.
 *
 * elapsedSeconds (от клиента) — сколько реально прошло от старта БЕЗ пауз.
 * Из этого считаем overtime = elapsedSeconds - durationMinutes*60.
 */

import { NextResponse } from "next/server";
import OpenAI from "openai";
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
import {
  buildReviewPrompt,
  buildUserMessage,
  validateAndFixReview,
} from "@/lib/essay/review-prompt";
import type { EssayReview } from "@/lib/essay/types";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90; // Сочинение через Claude может ~40 сек

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

function resolveTopicTitle(topicId: string, subjectKey: string): string {
  const codifier = CODIFIER_BY_SUBJECT[subjectKey];
  if (!codifier) return topicId;
  const withoutPrefix = topicId.includes("-") ? topicId.replace(/^[a-z-]+?-/, "") : topicId;
  const found = codifier.find(t => t.code === withoutPrefix);
  return found?.title ?? topicId;
}

interface VariantItem {
  taskNumber: number;
  taskDbId: string;
  primaryScore: number;
  topicId: string;
  correct: number;
}

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  let body: { attemptId?: string; elapsedSeconds?: number };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "невалидный JSON" }, { status: 400 });
  }

  const { attemptId, elapsedSeconds } = body;
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

  const spec = getExamSpec(attempt.subjectKey);
  if (!spec) return NextResponse.json({ error: "Спецификация не найдена" }, { status: 500 });

  const variant = attempt.variant as unknown as VariantItem[];
  const durationSeconds = attempt.durationMinutes * 60;
  const totalElapsed = typeof elapsedSeconds === "number" && elapsedSeconds > 0
    ? Math.round(elapsedSeconds)
    : durationSeconds; // fallback — считаем что уложился
  const overtimeSeconds = Math.max(0, totalElapsed - durationSeconds);

  // Ответы ученика
  const userAnswers = new Map<number, { answer: number | null; elapsedAt: number | null }>();
  for (const a of attempt.answers) {
    userAnswers.set(a.taskNumber, {
      answer: a.answer,
      elapsedAt: a.elapsedSecondsAtAnswer,
    });
  }

  // Считаем баллы по тестам: fact + conditional отдельно
  let testsFactualScore = 0;
  let testsConditionalScore = 0;
  const details = [];
  const weakTopics = new Map<string, { total: number; correct: number }>();

  for (const v of variant) {
    const answer = userAnswers.get(v.taskNumber);
    const isCorrect = answer?.answer === v.correct;
    // «В срок» — если ответ дан до окончания durationSeconds
    const wasInTime = answer?.elapsedAt == null
      ? overtimeSeconds === 0  // если время не пришло — считаем «в срок» только если уложился в целом
      : answer.elapsedAt <= durationSeconds;

    if (isCorrect) {
      testsConditionalScore += v.primaryScore;
      if (wasInTime) testsFactualScore += v.primaryScore;
    }

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
      } catch {/* */}
      explanation = task.explanation ?? "";
    }

    details.push({
      taskNumber: v.taskNumber,
      question,
      options,
      correctAnswer: v.correct,
      userAnswer: answer?.answer ?? null,
      isCorrect,
      wasInTime,
      primaryScore: v.primaryScore,
      earnedScore: isCorrect ? v.primaryScore : 0,
      explanation,
      topicId: v.topicId,
    });
  }

  // Проверка сочинения (если есть)
  let essayReview: EssayReview | null = null;
  let essayScore = 0;
  let essayWasInTime = true;

  if (spec.hasEssayPhase && attempt.essayTextId && attempt.essayContent?.trim()) {
    const wordCount = attempt.essayContent.trim().split(/\s+/).filter(w => w.length > 0).length;
    // Слишком короткое — не проверяем через Claude
    if (wordCount >= 70) {
      const essayText = await prisma.essayText.findUnique({ where: { id: attempt.essayTextId } });
      if (essayText && process.env.POLZA_API_KEY) {
        try {
          const client = new OpenAI({
            apiKey: process.env.POLZA_API_KEY,
            baseURL: process.env.POLZA_BASE_URL || "https://polza.ai/api/v1",
          });
          const model = process.env.POLZA_MODEL || "anthropic/claude-haiku-4.5";
          const resp = await client.chat.completions.create({
            model,
            max_tokens: 4000,
            messages: [
              { role: "system", content: buildReviewPrompt() },
              { role: "user", content: buildUserMessage(
                { body: essayText.body, problems: essayText.problems as string[] },
                attempt.essayContent.trim()
              ) },
            ],
          });
          const raw = (resp.choices[0]?.message?.content || "").replace(/```json\s*|\s*```/g, "").trim();
          const parsed = JSON.parse(raw);
          essayReview = validateAndFixReview(parsed);
          if (essayReview) essayScore = essayReview.totalScore;
        } catch (err) {
          console.error("[exam/finalize] essay review failed:", err);
          // Не блокируем финализацию — сочинение просто без оценки
        }
      }
    }
    // Сочинение считается «в срок», если ученик его дописал до звонка
    // (мы храним только финальный content, поэтому эвристика: если overtime > 15 минут,
    // считаем сочинение написанным «после звонка»)
    essayWasInTime = overtimeSeconds < 15 * 60;
  }

  // Итоговые баллы
  const factualPrimary = testsFactualScore + (essayWasInTime ? essayScore : 0);
  const conditionalPrimary = testsConditionalScore + essayScore;

  const factualTestScore = primaryToTest(attempt.subjectKey, factualPrimary);
  const conditionalTestScore = primaryToTest(attempt.subjectKey, conditionalPrimary);

  // Прогноз итогового — если у предмета нет фазы сочинения, экстраполируем от 1-й части
  const forecast = spec.hasEssayPhase
    ? { min: factualTestScore, expected: factualTestScore, max: factualTestScore }
    : forecastTotalScore(attempt.subjectKey, factualPrimary, attempt.maxPrimaryScore);

  // Слабые темы
  const weakTopicsList = Array.from(weakTopics.entries())
    .filter(([_, s]) => s.total > 0 && s.correct / s.total < 0.5)
    .map(([topicId, s]) => ({
      topicId,
      title: resolveTopicTitle(topicId, attempt.subjectKey),
      ratio: s.correct / s.total,
    }));

  const finalizedAt = new Date();

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      status: "finished",
      phase: "finished",
      finalizedAt,
      primaryScore: factualPrimary, // legacy-поле = factual
      testScorePart1: factualTestScore,
      forecastMin: forecast.min,
      forecastExpected: forecast.expected,
      forecastMax: forecast.max,
      secondsSpent: totalElapsed,
      overtimeSeconds,
      factualScore: factualPrimary,
      conditionalScore: conditionalPrimary,
      essayScore: spec.hasEssayPhase ? essayScore : null,
      essayReview: essayReview ? (essayReview as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });

  return NextResponse.json({
    attemptId,
    subjectKey: attempt.subjectKey,
    displayName: spec.displayName,
    hasEssayPhase: spec.hasEssayPhase,
    // Балл — двумя цифрами
    factualScore: factualPrimary,
    conditionalScore: conditionalPrimary,
    maxPrimaryScore: spec.maxPrimaryScoreTotal,
    factualTestScore,
    conditionalTestScore,
    forecast,
    // Время
    secondsSpent: totalElapsed,
    overtimeSeconds,
    durationSeconds,
    // Разбор
    weakTopics: weakTopicsList,
    details,
    essayContent: attempt.essayContent ?? null,
    essayReview,
    essayScore,
  });
}
