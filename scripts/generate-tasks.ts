/**
 * Генерация тренировочных ЕГЭ-заданий по подтемам ФИПИ.
 * По умолчанию — 40 заданий на подтему, 4 батча (базовые/средние/сред-сложные/сложные).
 *
 * Формат в БД: Task { topicId, exam, title, body(JSON), answer, explanation }.
 * topicId для мультипредметности: для русского — просто "3.7.6" (legacy),
 * для остальных — "{subject}-{код}" (например "social-1.3").
 *
 * Запуск:
 *   SUBJECT=russian    npm run rag:tasks
 *   SUBJECT=social     npm run rag:tasks
 *   и т.д.
 *
 * Переменные:
 *   TARGET_PER_TOPIC (по умолчанию 40)
 *   BATCH_SIZE       (по умолчанию 10)
 */

import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import { FIPI_RU } from "../src/data/fipi-codifier-ru";
import { FIPI_SOCIAL } from "../src/data/fipi-codifier-social";
import { FIPI_HISTORY } from "../src/data/fipi-codifier-history";
import { FIPI_MATH } from "../src/data/fipi-codifier-math";
import { FIPI_MATH_BASE } from "../src/data/fipi-codifier-math-base";
import { FIPI_PHYSICS } from "../src/data/fipi-codifier-physics";
import { FIPI_LITERATURE } from "../src/data/fipi-codifier-literature";
import { FIPI_ENGLISH } from "../src/data/fipi-codifier-english";
import type { FipiTopic } from "../src/data/fipi-codifier-ru";

// ═══ Конфигурация ═══

interface SubjectCfg {
  displayName: string;
  topics: FipiTopic[];
  exam: string;
  /** Префикс для topicId в БД (undefined для русского - legacy без префикса). */
  topicIdPrefix?: string;
  role: string;
  domainNotes: string;
}

const SUBJECTS: Record<string, SubjectCfg> = {
  russian: {
    displayName: "Русский язык", topics: FIPI_RU, exam: "ege",
    role: "методист ЕГЭ по русскому языку",
    domainNotes: "Задания на орфографию, пунктуацию, культуру речи, средства выразительности.",
  },
  social: {
    displayName: "Обществознание", topics: FIPI_SOCIAL, exam: "ege", topicIdPrefix: "social",
    role: "методист ЕГЭ по обществознанию",
    domainNotes: "Задания на понятия, связи, признаки, характеристики. Опирайся на ФГОС.",
  },
  history: {
    displayName: "История", topics: FIPI_HISTORY, exam: "ege", topicIdPrefix: "history",
    role: "методист ЕГЭ по истории",
    domainNotes: "Задания на даты, персоналии, причины и следствия событий, культуру эпохи.",
  },
  math: {
    displayName: "Математика (профиль)", topics: FIPI_MATH, exam: "ege", topicIdPrefix: "math",
    role: "методист ЕГЭ по математике профильного уровня",
    domainNotes: "Задачи с числовым ответом или выбором варианта. Формулы в LaTeX ($x^2$, $\\sqrt{2}$).",
  },
  "math-base": {
    displayName: "Математика (база)", topics: FIPI_MATH_BASE, exam: "ege-base", topicIdPrefix: "math-base",
    role: "методист ЕГЭ по математике базового уровня",
    domainNotes: "Практические задачи с числовым ответом. Проценты, графики, геометрия.",
  },
  physics: {
    displayName: "Физика", topics: FIPI_PHYSICS, exam: "ege", topicIdPrefix: "physics",
    role: "методист ЕГЭ по физике",
    domainNotes: "Задачи на понимание законов и применение формул. Единицы СИ. Формулы в LaTeX.",
  },
  literature: {
    displayName: "Литература", topics: FIPI_LITERATURE, exam: "ege", topicIdPrefix: "literature",
    role: "методист ЕГЭ по литературе",
    domainNotes: "Задания на знание произведений: сюжет, персонажи, приёмы, композиция.",
  },
  english: {
    displayName: "Английский язык", topics: FIPI_ENGLISH, exam: "ege", topicIdPrefix: "english",
    role: "методист ЕГЭ по английскому языку",
    domainNotes: "Задания на грамматику, лексику, чтение. Формулировки на английском, ответы можно на русском.",
  },
};

const SUBJECT_KEY = (process.env.SUBJECT || "russian").toLowerCase();
const cfg = SUBJECTS[SUBJECT_KEY];
if (!cfg) {
  console.error(`❌ Неизвестный SUBJECT="${SUBJECT_KEY}". Доступно: ${Object.keys(SUBJECTS).join(", ")}`);
  process.exit(1);
}

if (!process.env.POLZA_API_KEY) { console.error("❌ POLZA_API_KEY не задан."); process.exit(1); }
if (!process.env.DATABASE_URL)  { console.error("❌ DATABASE_URL не задан.");  process.exit(1); }

const client = new OpenAI({
  apiKey: process.env.POLZA_API_KEY,
  baseURL: process.env.POLZA_BASE_URL || "https://polza.ai/api/v1",
});
const MODEL = process.env.POLZA_MODEL || "anthropic/claude-haiku-4.5";
const TARGET = Number(process.env.TARGET_PER_TOPIC ?? "40");
const BATCH = Number(process.env.BATCH_SIZE ?? "10");
const prisma = new PrismaClient();

// ═══ Промпт ═══

type GenTask = {
  title: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty?: number;
};

const PROFILES = [
  { label: "базовые",         desc: "простые задания уровня начала подготовки, difficulty 1-2" },
  { label: "средние",         desc: "типичные задания реального ЕГЭ, difficulty 2" },
  { label: "средне-сложные",  desc: "с ловушками и требующие внимания, difficulty 2-3" },
  { label: "сложные",         desc: "олимпиадного уровня, difficulty 3, редкие случаи" },
];

const SYSTEM = `Ты — ${cfg.role}. Генерируешь тренировочные тестовые задания для школьников 10-11 класса.

${cfg.domainNotes}

Требования:
- Формат: закрытый тест с 4 вариантами ответа (один правильный).
- Задание проверяет понимание темы, не механическое заучивание.
- Варианты правдоподобные.
- В одном батче задания разные, не повторяйся.
- В explanation объясняешь, почему правильный вариант верен и почему неверные — неверны.

Ответ — СТРОГО валидный JSON-массив, без markdown:
[
  { "title": "…", "question": "…", "options": ["…","…","…","…"], "correct": 0, "explanation": "…", "difficulty": 2 },
  ...
]
correct — индекс правильного в options (0-3). difficulty — 1/2/3.`;

function userPrompt(t: FipiTopic, profile: typeof PROFILES[0], count: number, existing: number): string {
  return `Сгенерируй ${count} заданий по теме ЕГЭ по ${cfg.displayName}:
"${t.title}" (код ${t.code})

Профиль: ${profile.label} — ${profile.desc}.
${existing > 0 ? `В базе уже есть ${existing} заданий, сделай ДРУГИЕ.\n` : ""}
Только валидный JSON-массив, без \`\`\`.`;
}

async function generateBatch(t: FipiTopic, p: typeof PROFILES[0], count: number, existing: number): Promise<GenTask[]> {
  const resp = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 6000,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user",   content: userPrompt(t, p, count, existing) },
    ],
  });
  const raw = (resp.choices[0]?.message?.content || "").replace(/```json\s*|\s*```/g, "").trim();
  const parsed = JSON.parse(raw) as GenTask[];
  if (!Array.isArray(parsed)) throw new Error("не массив");
  return parsed.filter(t =>
    t.question && Array.isArray(t.options) && t.options.length === 4 &&
    typeof t.correct === "number" && t.correct >= 0 && t.correct <= 3
  );
}

// ═══ Main ═══

/** Строит topicId для БД: для русского — просто код, для остальных — "prefix-код". */
function toDbTopicId(code: string): string {
  return cfg.topicIdPrefix ? `${cfg.topicIdPrefix}-${code}` : code;
}

async function main() {
  console.log(`\n📝 Расширенная генерация заданий: ${cfg.displayName}`);
  console.log(`   Модель: ${MODEL}, тем: ${cfg.topics.length}, цель: ${TARGET}/тема, батч: ${BATCH}\n`);

  let totalCreated = 0, batchErrors = 0;

  for (const t of cfg.topics) {
    const dbTopicId = toDbTopicId(t.code);
    const existing = await prisma.task.count({
      where: { topicId: dbTopicId, exam: cfg.exam },
    });

    if (existing >= TARGET) {
      console.log(`⏭️   ${t.code}\tуже ${existing}/${TARGET}, пропускаю`);
      continue;
    }

    const needed = TARGET - existing;
    const batches = Math.ceil(needed / BATCH);
    console.log(`\n⚙️   ${t.code}\t${t.title.slice(0, 55)}...`);
    console.log(`     Имеется: ${existing}. Нужно ещё: ${needed} (${batches} батчей)`);

    let current = existing, added = 0;

    for (let b = 0; b < batches; b++) {
      const remaining = TARGET - current;
      const count = Math.min(BATCH, remaining);
      const profile = PROFILES[b % PROFILES.length];

      try {
        console.log(`     батч ${b + 1}/${batches} (${count} × ${profile.label})...`);
        const tasks = await generateBatch(t, profile, count, current);
        for (const gen of tasks) {
          await prisma.task.create({
            data: {
              topicId: dbTopicId,
              exam: cfg.exam,
              title: gen.title,
              body: JSON.stringify({ question: gen.question, options: gen.options, correct: gen.correct }),
              answer: String(gen.correct),
              explanation: gen.explanation,
              difficulty: gen.difficulty ?? 2,
              tags: [profile.label],
            },
          });
          added++; current++;
        }
        console.log(`     ✅  добавлено ${tasks.length} (всего ${current})`);
      } catch (err) {
        console.error(`     ❌  батч ${b + 1} упал: ${(err as Error).message}`);
        batchErrors++;
      }
      await new Promise(r => setTimeout(r, 400));
    }

    totalCreated += added;
    console.log(`     🎯 итого добавлено ${added} к ${t.code}`);
  }

  console.log(`\n🎉 Готово.`);
  console.log(`   Создано заданий: ${totalCreated}`);
  console.log(`   Батчей с ошибками: ${batchErrors}`);
  const finalCount = await prisma.task.count({ where: { exam: cfg.exam } });
  console.log(`   Всего в банке (${cfg.exam}): ${finalCount}`);

  await prisma.$disconnect();
}

main().catch(async e => { console.error("Фатальная ошибка:", e); await prisma.$disconnect(); process.exit(1); });
