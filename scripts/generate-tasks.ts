/**
 * Скрипт генерации тренировочных ЕГЭ-заданий по темам кодификатора ФИПИ.
 *
 * Для каждой подтемы просит Claude сгенерировать 5 заданий с 4 вариантами
 * ответа, правильным ответом и разбором. Сохраняет в таблицу Task в БД.
 *
 * Модель Task:
 *   topicId    — код кодификатора ("3.7.6")
 *   exam       — "ege"
 *   title      — краткое название задания
 *   body       — JSON: { question, options[], correct }
 *   answer     — просто индекс правильного как строка
 *   explanation — разбор
 *
 * Запуск:
 *   POLZA_API_KEY=sk-... DATABASE_URL=postgres://... npx tsx scripts/generate-tasks.ts
 *
 * Идемпотентен: при повторном запуске переиспользует детерминированные ID.
 * Стоимость: ~$0.01 за подтему × 53 = $0.5 ≈ 40 ₽.
 * Длительность: ~10-15 минут.
 */

import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import { FIPI_RU, type FipiTopic } from "../src/data/fipi-codifier-ru";

const apiKey = process.env.POLZA_API_KEY;
if (!apiKey) {
  console.error("❌ POLZA_API_KEY не задан.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL не задан.");
  process.exit(1);
}

const client = new OpenAI({
  apiKey,
  baseURL: process.env.POLZA_BASE_URL || "https://polza.ai/api/v1",
});

const MODEL = process.env.POLZA_MODEL || "anthropic/claude-haiku-4.5";
const TASKS_PER_TOPIC = 5;

const prisma = new PrismaClient();

type GeneratedTask = {
  title: string;      // краткая формулировка
  question: string;   // сам вопрос
  options: string[];  // 4 варианта
  correct: number;    // 0-3
  explanation: string;
  difficulty?: number; // 1-3
};

const SYSTEM_PROMPT = `Ты — методист ЕГЭ по русскому языку. Генерируешь тренировочные задания
для школьников 10-11 класса.

Требования к заданиям:
- Формат: закрытый тест с 4 вариантами ответа (только один правильный).
- Вопрос должен проверять понимание темы, а не механическое заучивание.
- Варианты правдоподобные — все выглядят как возможные ответы, а не очевидно неправильные.
- В разборе (explanation) объясняешь, почему правильный вариант верен, и почему неверные — неверны.

Формат ответа — СТРОГО валидный JSON-массив без markdown:
[
  {
    "title": "Краткая формулировка задания (3-6 слов)",
    "question": "Полный текст вопроса.",
    "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"],
    "correct": 0,
    "explanation": "Разбор 60-120 слов.",
    "difficulty": 2
  },
  ...
]

correct — индекс правильного варианта в options (0-3).
difficulty — 1 (простое), 2 (среднее), 3 (сложное).`;

function buildUserPrompt(topic: FipiTopic): string {
  return `Сгенерируй ${TASKS_PER_TOPIC} тренировочных заданий по теме ЕГЭ:
"${topic.title}" (код кодификатора: ${topic.code})

Задания должны быть разной сложности (1-2 простых, 2 средних, 1 сложное).
Помни: только валидный JSON-массив, без \`\`\`json или иного обрамления.`;
}

async function generateForTopic(topic: FipiTopic): Promise<GeneratedTask[]> {
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 3500,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(topic) },
    ],
  });

  const raw = (response.choices[0]?.message?.content || "")
    .replace(/```json\s*|\s*```/g, "")
    .trim();

  const parsed = JSON.parse(raw) as GeneratedTask[];
  if (!Array.isArray(parsed)) throw new Error("не массив");

  // валидация
  return parsed.filter(
    (t) =>
      t.question &&
      Array.isArray(t.options) &&
      t.options.length === 4 &&
      typeof t.correct === "number" &&
      t.correct >= 0 &&
      t.correct <= 3
  );
}

async function main() {
  console.log(`📝 Генерирую задания по ${FIPI_RU.length} темам ФИПИ`);
  console.log(`   Модель: ${MODEL}`);
  console.log(`   По ${TASKS_PER_TOPIC} заданий на тему = ${FIPI_RU.length * TASKS_PER_TOPIC} заданий\n`);

  let created = 0;
  let failed = 0;

  for (const topic of FIPI_RU) {
    const existing = await prisma.task.count({
      where: { topicId: topic.code, exam: "ege" },
    });
    if (existing >= TASKS_PER_TOPIC) {
      console.log(`⏭️   ${topic.code}  уже есть ${existing} заданий, пропускаю`);
      continue;
    }

    try {
      console.log(`⚙️   ${topic.code}  ${topic.title.slice(0, 55)}...`);
      const tasks = await generateForTopic(topic);

      for (const t of tasks) {
        await prisma.task.create({
          data: {
            topicId: topic.code,
            exam: "ege",
            title: t.title,
            body: JSON.stringify({
              question: t.question,
              options: t.options,
              correct: t.correct,
            }),
            answer: String(t.correct),
            explanation: t.explanation,
            difficulty: t.difficulty ?? 2,
            tags: [],
          },
        });
        created++;
      }
      console.log(`✅  ${topic.code}  готово (${tasks.length} заданий)`);
    } catch (err) {
      console.error(`❌  ${topic.code}  ошибка:`, (err as Error).message);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\n🎉 Готово.`);
  console.log(`   Создано заданий: ${created}`);
  console.log(`   Тем с ошибкой: ${failed}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Фатальная ошибка:", err);
  await prisma.$disconnect();
  process.exit(1);
});
