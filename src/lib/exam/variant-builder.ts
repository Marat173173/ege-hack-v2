/**
 * Генератор варианта ЕГЭ.
 *
 * Берёт спецификацию для предмета (кол-во заданий, подтемы для каждого)
 * и подбирает по одному случайному заданию для каждого номера из
 * указанных подтем.
 *
 * Гарантирует, что вариант — реалистичный: задание 3 — всегда лексика,
 * задание 8 — синтаксис, и т.д.
 */

import { prisma } from "@/lib/db/prisma";
import { getExamSpec, type ExamSpec } from "@/data/exam-specs";

export interface ExamTask {
  /** Номер в варианте (1..N) */
  taskNumber: number;
  /** ID задания в БД (Task.id) */
  taskDbId: string;
  /** Максимум баллов за задание */
  primaryScore: number;
  /** Заголовок раздела для UI */
  description: string;
  /** Формулировка задания */
  question: string;
  /** 4 варианта ответа */
  options: string[];
  /** Правильный ответ (индекс 0-3) — НЕ отсылаем на клиент, храним для проверки */
  correct: number;
  /** Разбор — показываем после финализации */
  explanation: string;
  /** Код подтемы (для отчёта по слабым местам) */
  topicId: string;
}

/**
 * Строит вариант ЕГЭ для указанного предмета.
 * Если по какой-то подтеме нет заданий — задание пропускается (в реальном
 * симуляторе такие «дыры» будут видны как пустые слоты).
 */
export async function generateVariant(subjectKey: string): Promise<{
  spec: ExamSpec;
  tasks: ExamTask[];
}> {
  const spec = getExamSpec(subjectKey);
  if (!spec) throw new Error(`Нет спецификации для предмета "${subjectKey}"`);

  const tasks: ExamTask[] = [];

  for (const taskSpec of spec.tasks) {
    // Ищем случайное задание из указанных подтем
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
      // Нет задания по этим подтемам — пропускаем номер
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
      // Битое задание в БД — тоже пропускаем
      console.warn(`[exam] Битое задание ${t.id}, пропускаю`);
    }
  }

  return { spec, tasks };
}
