/**
 * Генератор варианта ЕГЭ.
 *
 * Собирает задания по спецификации + при hasEssayPhase выбирает случайный
 * исходный текст для сочинения из EssayText.
 */

import { prisma } from "@/lib/db/prisma";
import { getExamSpec, type ExamSpec } from "@/data/exam-specs";

export interface ExamTask {
  taskNumber: number;
  taskDbId: string;
  primaryScore: number;
  description: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topicId: string;
}

export interface VariantResult {
  spec: ExamSpec;
  tasks: ExamTask[];
  /** ID выбранного исходного текста для сочинения (только если hasEssayPhase). */
  essayTextId: string | null;
}

export async function generateVariant(subjectKey: string): Promise<VariantResult> {
  const spec = getExamSpec(subjectKey);
  if (!spec) throw new Error(`Нет спецификации для предмета "${subjectKey}"`);

  const tasks: ExamTask[] = [];

  for (const taskSpec of spec.tasks) {
    const row = await prisma.$queryRaw<Array<{
      id: string;
      body: string;
      answer: string | null;
      explanation: string | null;
      topicId: string;
    }>>`
      SELECT id, body, answer, explanation, "topicId"
      FROM "Task"
      WHERE "topicId" = ANY(${taskSpec.subtopics})
      ORDER BY random()
      LIMIT 1
    `;

    if (row.length === 0) {
      console.warn(`[exam] Нет заданий для №${taskSpec.taskNumber} (${taskSpec.description})`);
      continue;
    }

    const t = row[0];
    try {
      const parsed = JSON.parse(t.body) as {
        question: string;
        options: string[];
        correct: number;
      };
      tasks.push({
        taskNumber: taskSpec.taskNumber,
        taskDbId: t.id,
        primaryScore: taskSpec.primaryScore,
        description: taskSpec.description,
        question: parsed.question,
        options: parsed.options,
        correct: parsed.correct,
        explanation: t.explanation ?? "",
        topicId: t.topicId,
      });
    } catch {
      console.warn(`[exam] Битое задание ${t.id}, пропускаю`);
    }
  }

  // Выбираем случайный исходный текст для сочинения (только если этот предмет с сочинением)
  let essayTextId: string | null = null;
  if (spec.hasEssayPhase) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "EssayText" ORDER BY random() LIMIT 1
    `;
    essayTextId = rows[0]?.id ?? null;
    if (!essayTextId) {
      console.warn(`[exam] Для предмета ${subjectKey} нет исходных текстов сочинения`);
    }
  }

  return { spec, tasks, essayTextId };
}
