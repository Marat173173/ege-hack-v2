/**
 * Расширенная генерация тренировочных ЕГЭ-заданий по темам кодификатора ФИПИ.
 *
 * По умолчанию генерирует ~40 заданий на подтему, батчами по 10 заданий за раз
 * (4 батча на подтему). Каждый батч имеет свой профиль сложности:
 *   - батч 1: базовые (difficulty 1-2)
 *   - батч 2: средние (difficulty 2)
 *   - батч 3: средне-сложные (difficulty 2-3)
 *   - батч 4: сложные (difficulty 3)
 *
 * Идемпотентен — считает уже существующие задания и добирает до цели.
 *
 * Запуск:
 *   POLZA_API_KEY=sk-... DATABASE_URL=postgres://... npx tsx scripts/generate-tasks.ts
 *
 * Стоимость: ~$0.04 за подтему × 63 = $2.5 ≈ 250 ₽.
 * Длительность: ~1–2 часа.
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
const TARGET_PER_TOPIC = Number(process.env.TARGET_PER_TOPIC ?? "40");
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? "10");

const prisma = new PrismaClient();

type GeneratedTask = {
  title: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty?: number;
};

/** Профили сложности для батчей: по возрастающей. */
const DIFFICULTY_PROFILES = [
  { label: "базовые", desc: "простые задания уровня начала подготовки, difficulty 1–2" },
  { label: "средние", desc: "типичные задания реального ЕГЭ, difficulty 2" },
  { label: "средне-сложные", desc: "задания с ловушками и требующие внимания, difficulty 2–3" },
  { label: "сложные", desc: "олимпиадного уровня, difficulty 3, с редкими случаями и исключениями" },
];

const SYSTEM_PROMPT = `Ты — методист ЕГЭ по русскому языку. Генерируешь тренировочные задания
для школьников 10-11 класса.

Требования к заданиям:
- Формат: закрытый тест с 4 вариантами ответа (только один правильный).
- Вопрос должен проверять понимание темы, а не механическое заучивание.
- Варианты правдоподобные — все выглядят как возможные ответы.
- Задания в одном батче должны различаться формулировками и материалом. Не повторяйся!
- В разборе (explanation) объясняешь, почему правильный вариант верен и почему неверные — неверны.

Формат ответа — СТРОГО валидный JSON-массив без markdown:
[
  {
    "title": "Краткая формулировка (3-6 слов)",
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

function buildUserPrompt(topic: FipiTopic, profile: (typeof DIFFICULTY_PROFILES)[number], count: number, existing: number): string {
  return `Сгенерируй ${count} тренировочных заданий по теме ЕГЭ:
"${topic.title}" (код кодификатора: ${topic.code})

Профиль этой партии: ${profile.label} — ${profile.desc}.
${existing > 0 ? `\nВ базе уже есть ${existing} заданий по этой теме — сгенерируй ДРУГИЕ задания, не повторяющие уже данные материалы.` : ""}

Только валидный JSON-массив, без \`\`\`json или иного обрамления.`;
}

async function generateBatch(topic: FipiTopic, profile: (typeof DIFFICULTY_PROFILES)[number], count: number, existing: number): Promise<GeneratedTask[]> {
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 6000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(topic, profile, count, existing) },
    ],
  });

  const raw = (response.choices[0]?.message?.content || "")
    .replace(/```json\s*|\s*```/g, "")
    .trim();

  const parsed = JSON.parse(raw) as GeneratedTask[];
  if (!Array.isArray(parsed)) throw new Error("не массив");

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
  console.log(`📝 Расширение банка заданий:`);
  console.log(`   Модель: ${MODEL}`);
  console.log(`   Тем: ${FIPI_RU.length}`);
  console.log(`   Цель: ${TARGET_PER_TOPIC} заданий на тему`);
  console.log(`   Батч: ${BATCH_SIZE} заданий за запрос\n`);

  let totalCreated = 0;
  let topicsWithErrors = 0;

  for (const topic of FIPI_RU) {
    const existing = await prisma.task.count({
      where: { topicId: topic.code, exam: "ege" },
    });

    if (existing >= TARGET_PER_TOPIC) {
      console.log(`⏭️   ${topic.code}  уже есть ${existing}/${TARGET_PER_TOPIC}, пропускаю`);
      continue;
    }

    const needed = TARGET_PER_TOPIC - existing;
    const batches = Math.ceil(needed / BATCH_SIZE);
    console.log(`\n⚙️   ${topic.code}  ${topic.title.slice(0, 55)}...`);
    console.log(`     Имеется: ${existing}. Нужно ещё: ${needed} (${batches} батчей)`);

    let addedForTopic = 0;
    let currentExisting = existing;

    for (let b = 0; b < batches; b++) {
      const remaining = TARGET_PER_TOPIC - currentExisting;
      const count = Math.min(BATCH_SIZE, remaining);
      const profile = DIFFICULTY_PROFILES[b % DIFFICULTY_PROFILES.length];

      try {
        console.log(`     батч ${b + 1}/${batches} (${count} × ${profile.label})...`);
        const tasks = await generateBatch(topic, profile, count, currentExisting);

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
              tags: [profile.label],
            },
          });
          addedForTopic++;
          currentExisting++;
        }
        console.log(`     ✅  добавлено ${tasks.length} (всего у темы: ${currentExisting})`);
      } catch (err) {
        console.error(`     ❌  батч ${b + 1} упал: ${(err as Error).message}`);
        topicsWithErrors++;
      }

      await new Promise((r) => setTimeout(r, 400));
    }

    totalCreated += addedForTopic;
    console.log(`     🎯 итого добавлено ${addedForTopic} к теме ${topic.code}`);
  }

  console.log(`\n🎉 Готово.`);
  console.log(`   Всего создано заданий: ${totalCreated}`);
  console.log(`   Батчей с ошибками: ${topicsWithErrors}`);

  // Финальный отчёт
  const finalCount = await prisma.task.count({ where: { exam: "ege" } });
  console.log(`   Всего в банке: ${finalCount}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Фатальная ошибка:", err);
  await prisma.$disconnect();
  process.exit(1);
});
