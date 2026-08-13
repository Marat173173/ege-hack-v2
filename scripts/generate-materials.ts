/**
 * Генератор учебных материалов через Polza AI (Claude Haiku 4.5).
 *
 * По каждой подтеме кодификатора ФИПИ создаёт 4 фрагмента:
 *   rule       — правило/теория (100-200 слов)
 *   example    — разбор задания (100-200 слов)
 *   mistake    — типичные ошибки (60-120 слов)
 *   definition — краткие определения ключевых терминов (60-120 слов)
 *
 * Сохраняет в data/generated/{subject}/*.json.
 * Затем rag:index читает эту папку и заливает в БД + считает эмбеддинги.
 *
 * Запуск для разных предметов:
 *   SUBJECT=russian     npm run rag:generate   (или без переменной — русский по умолчанию)
 *   SUBJECT=social      npm run rag:generate
 *   SUBJECT=history     npm run rag:generate
 *   SUBJECT=math        npm run rag:generate
 *   SUBJECT=math-base   npm run rag:generate
 *   SUBJECT=physics     npm run rag:generate
 *   SUBJECT=literature  npm run rag:generate
 *   SUBJECT=english     npm run rag:generate
 *
 * Идемпотентен: пропускает подтемы, для которых JSON уже существует.
 * Стоимость: ~$0.30 на предмет через Polza (~30 ₽).
 * Длительность: 10-20 минут на предмет.
 */

import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import { FIPI_RU } from "../src/data/fipi-codifier-ru";
import { FIPI_SOCIAL } from "../src/data/fipi-codifier-social";
import { FIPI_HISTORY } from "../src/data/fipi-codifier-history";
import { FIPI_MATH } from "../src/data/fipi-codifier-math";
import { FIPI_MATH_BASE } from "../src/data/fipi-codifier-math-base";
import { FIPI_PHYSICS } from "../src/data/fipi-codifier-physics";
import { FIPI_LITERATURE } from "../src/data/fipi-codifier-literature";
import { FIPI_ENGLISH } from "../src/data/fipi-codifier-english";
import type { FipiTopic } from "../src/data/fipi-codifier-ru";

// ═══════════════════════════════════════════════════════════════
// Конфигурация по предметам
// ═══════════════════════════════════════════════════════════════

interface SubjectConfig {
  key: string;
  displayName: string;
  topics: FipiTopic[];
  /** Специфический контекст для промпта — «ты методист по …» */
  domainPromptRole: string;
  /** Особенности — формулы для физики, произведения для литературы и т.д. */
  domainNotes: string;
}

const SUBJECTS: Record<string, SubjectConfig> = {
  russian: {
    key: "russian",
    displayName: "Русский язык",
    topics: FIPI_RU,
    domainPromptRole: "методист ЕГЭ по русскому языку",
    domainNotes: "Используй правила орфографии и пунктуации ФГОС. Примеры бери из русской литературы или живого языка.",
  },
  social: {
    key: "social",
    displayName: "Обществознание",
    topics: FIPI_SOCIAL,
    domainPromptRole: "методист ЕГЭ по обществознанию",
    domainNotes: "Используй понятия из ФГОС и ФОП. Приводи примеры из современной жизни России и мира.",
  },
  history: {
    key: "history",
    displayName: "История",
    topics: FIPI_HISTORY,
    domainPromptRole: "методист ЕГЭ по истории России и всеобщей истории",
    domainNotes: "Используй точные даты и имена. Опирайся на историко-культурный стандарт РФ.",
  },
  math: {
    key: "math",
    displayName: "Математика (профиль)",
    topics: FIPI_MATH,
    domainPromptRole: "методист ЕГЭ по математике профильного уровня",
    domainNotes: "Формулы записывай в LaTeX-стиле: $x^2$, $\\sqrt{2}$, $\\int$. Разборы задач — пошаговые.",
  },
  "math-base": {
    key: "math-base",
    displayName: "Математика (база)",
    topics: FIPI_MATH_BASE,
    domainPromptRole: "методист ЕГЭ по математике базового уровня",
    domainNotes: "Практические задачи (проценты, чтение графиков, простая геометрия). Без сложного анализа.",
  },
  physics: {
    key: "physics",
    displayName: "Физика",
    topics: FIPI_PHYSICS,
    domainPromptRole: "методист ЕГЭ по физике",
    domainNotes: "Формулы в LaTeX. В разборах указывай единицы измерения СИ. Физический смысл — первичен.",
  },
  literature: {
    key: "literature",
    displayName: "Литература",
    topics: FIPI_LITERATURE,
    domainPromptRole: "методист ЕГЭ по литературе",
    domainNotes: "По каждому произведению: тематика, композиция, ключевые образы, литературные приёмы. Цитируй.",
  },
  english: {
    key: "english",
    displayName: "Английский язык",
    topics: FIPI_ENGLISH,
    domainPromptRole: "методист ЕГЭ по английскому языку",
    domainNotes: "Примеры на английском с переводом на русский. Правила грамматики — простыми словами.",
  },
};

// ═══════════════════════════════════════════════════════════════
// Инициализация
// ═══════════════════════════════════════════════════════════════

const SUBJECT_KEY = (process.env.SUBJECT || "russian").toLowerCase();
const subject = SUBJECTS[SUBJECT_KEY];
if (!subject) {
  console.error(`❌ Неизвестный SUBJECT="${SUBJECT_KEY}".`);
  console.error(`Доступные: ${Object.keys(SUBJECTS).join(", ")}`);
  process.exit(1);
}

if (!process.env.POLZA_API_KEY) {
  console.error("❌ POLZA_API_KEY не задан.");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.POLZA_API_KEY,
  baseURL: process.env.POLZA_BASE_URL || "https://polza.ai/api/v1",
});
const MODEL = process.env.POLZA_MODEL || "anthropic/claude-haiku-4.5";
const OUT_DIR = path.join("data", "generated", subject.key);
fs.mkdirSync(OUT_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════
// Генерация
// ═══════════════════════════════════════════════════════════════

type Material = { kind: "rule" | "example" | "mistake" | "definition"; title: string; text: string };

function systemPrompt(): string {
  return `Ты — ${subject.domainPromptRole}. Пишешь короткие ясные учебные материалы для школьников 10-11 класса.

${subject.domainNotes}

По заданной подтеме кодификатора ФИПИ создаёшь 4 фрагмента:
1. rule       — правило/теория, 100-200 слов. Ясно объясни главное.
2. example    — разбор реального задания ЕГЭ, 100-200 слов. Шаг за шагом.
3. mistake    — 2-3 типичных ошибки школьников на этой теме, 60-120 слов.
4. definition — 3-5 ключевых терминов темы с определениями, 60-120 слов.

Формат ответа — СТРОГО валидный JSON, без markdown и без \`\`\`:
{
  "materials": [
    { "kind": "rule",       "title": "…", "text": "…" },
    { "kind": "example",    "title": "…", "text": "…" },
    { "kind": "mistake",    "title": "…", "text": "…" },
    { "kind": "definition", "title": "…", "text": "…" }
  ]
}`;
}

async function generateForTopic(t: FipiTopic): Promise<{ materials: Material[] }> {
  const resp = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [
      { role: "system", content: systemPrompt() },
      { role: "user",   content: `Подтема кодификатора ФИПИ ${t.code}: "${t.title}"` },
    ],
  });
  const raw = (resp.choices[0]?.message?.content || "").replace(/```json\s*|\s*```/g, "").trim();
  return JSON.parse(raw);
}

async function main() {
  console.log(`\n📚 Генерирую материалы: ${subject.displayName}`);
  console.log(`   Модель: ${MODEL}`);
  console.log(`   Подтем: ${subject.topics.length}`);
  console.log(`   Выход: ${OUT_DIR}\n`);

  let done = 0, skipped = 0, failed = 0;

  for (const t of subject.topics) {
    const codeSafe = t.code.replace(/[.\s]/g, "_");
    const outPath = path.join(OUT_DIR, `${codeSafe}.json`);
    if (fs.existsSync(outPath)) {
      console.log(`⏭️   ${t.code}\tуже сгенерирован`);
      skipped++;
      continue;
    }

    try {
      console.log(`⚙️   ${t.code}\t${t.title.slice(0, 60)}...`);
      const result = await generateForTopic(t);
      if (!Array.isArray(result.materials) || result.materials.length !== 4) {
        throw new Error("ожидался массив из 4 материалов");
      }
      fs.writeFileSync(outPath, JSON.stringify({
        topicCode: t.code,
        topicTitle: t.title,
        parent: t.parent ?? null,
        materials: result.materials,
      }, null, 2));
      console.log(`✅  ${t.code}\tготово (4 фрагмента)`);
      done++;
    } catch (err) {
      console.error(`❌  ${t.code}\tошибка: ${(err as Error).message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n🎉 Готово.`);
  console.log(`   Создано: ${done}`);
  console.log(`   Пропущено: ${skipped}`);
  console.log(`   Ошибок: ${failed}`);
  console.log(`\nСледующий шаг: SUBJECT=${subject.key} npm run rag:index`);
}

main().catch(e => { console.error("Фатальная ошибка:", e); process.exit(1); });
