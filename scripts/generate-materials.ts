/**
 * Скрипт генерации учебных материалов по темам кодификатора ФИПИ.
 *
 * Для каждой темы вызывает Claude API и просит написать:
 *   - правило (rule)         — суть темы простыми словами
 *   - пример (example)       — разбор типового задания ЕГЭ
 *   - типичные ошибки (mistake)
 *   - терминология (definition)
 *
 * Результат сохраняется в data/generated/ru/{topicCode}.json.
 *
 * Запуск:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/generate-materials.ts
 *
 * Можно прервать в любой момент — скрипт пропускает уже сгенерированные темы
 * при повторном запуске.
 *
 * Стоимость: ~$0.005 за тему (Haiku) × 53 темы ≈ $0.27 за весь русский язык.
 */

import Anthropic from "@anthropic-ai/sdk";
import { FIPI_RU, type FipiTopic } from "../src/data/fipi-codifier-ru";
import * as fs from "fs";
import * as path from "path";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("❌ Не задан ANTHROPIC_API_KEY. Установи: $env:ANTHROPIC_API_KEY=\"sk-ant-...\"");
  process.exit(1);
}

const client = new Anthropic({ apiKey });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const OUT_DIR = path.join("data", "generated", "ru");

type Material = {
  kind: "rule" | "example" | "mistake" | "definition";
  title: string;
  text: string;
};

type TopicOutput = {
  topicCode: string;
  topicTitle: string;
  parent: string | null;
  materials: Material[];
};

const SYSTEM_PROMPT = `Ты — методист подготовки к ЕГЭ по русскому языку.
Пишешь учебные материалы для школьников 10–11 классов.

Стиль:
- Простой человеческий язык, без занудства и канцеляризма
- Конкретно, по делу, с примерами
- Каждый материал — самодостаточный фрагмент 100-300 слов
- Никаких воды, общих слов "очень важно", "ключевая роль"

Формат ответа — СТРОГО валидный JSON-массив без обрамления markdown:
[
  {"kind": "rule", "title": "...", "text": "..."},
  {"kind": "example", "title": "...", "text": "..."},
  {"kind": "mistake", "title": "...", "text": "..."},
  {"kind": "definition", "title": "...", "text": "..."}
]

Поля:
- kind: "rule" (правило), "example" (разбор), "mistake" (типичная ошибка), "definition" (термины)
- title: краткое название фрагмента (3-7 слов)
- text: сам материал (100-300 слов, простой текст без markdown)`;

function buildUserPrompt(topic: FipiTopic): string {
  return `Сгенерируй 4 учебных материала по теме ЕГЭ:
"${topic.title}" (код кодификатора ФИПИ: ${topic.code})

Структура: ровно 4 фрагмента в массиве, по одному каждого kind:
1. rule — суть темы, как её понимать и применять
2. example — разбор одного типового задания ЕГЭ с этой темой (с пошаговым решением)
3. mistake — типичные ошибки школьников + как их избежать
4. definition — ключевые термины темы с короткими определениями

Помни: только валидный JSON-массив без \`\`\`json или другого обрамления.`;
}

async function generateForTopic(topic: FipiTopic): Promise<Material[]> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(topic) }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || !("text" in block)) throw new Error("пустой ответ от Claude");

  // Срезаем возможные markdown-обёртки на всякий случай
  const raw = block.text.replace(/```json\s*|\s*```/g, "").trim();

  try {
    const parsed = JSON.parse(raw) as Material[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("ответ не массив или пустой");
    }
    return parsed;
  } catch (err) {
    console.error("⚠️  Не удалось распарсить JSON. Сырой ответ:\n", raw.slice(0, 300));
    throw err;
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`📚 Генерирую материалы по ${FIPI_RU.length} темам ФИПИ`);
  console.log(`   Модель: ${MODEL}`);
  console.log(`   Папка вывода: ${OUT_DIR}\n`);

  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const topic of FIPI_RU) {
    const outFile = path.join(OUT_DIR, `${topic.code.replace(/\./g, "_")}.json`);

    if (fs.existsSync(outFile)) {
      console.log(`⏭️   ${topic.code}  уже есть, пропускаю`);
      skipped++;
      continue;
    }

    try {
      console.log(`⚙️   ${topic.code}  ${topic.title.slice(0, 60)}...`);
      const materials = await generateForTopic(topic);

      const out: TopicOutput = {
        topicCode: topic.code,
        topicTitle: topic.title,
        parent: topic.parent,
        materials,
      };
      fs.writeFileSync(outFile, JSON.stringify(out, null, 2), "utf8");
      console.log(`✅  ${topic.code}  готово (${materials.length} фрагментов)`);
      done++;
    } catch (err) {
      console.error(`❌  ${topic.code}  ошибка:`, (err as Error).message);
      failed++;
    }

    // Небольшая пауза, чтобы не упереться в rate limit Anthropic
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n🎉 Готово.`);
  console.log(`   Сгенерировано: ${done}`);
  console.log(`   Пропущено (уже было): ${skipped}`);
  console.log(`   Ошибок: ${failed}`);
}

main().catch((err) => {
  console.error("Фатальная ошибка:", err);
  process.exit(1);
});
