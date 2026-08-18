/**
 * Генератор исходных текстов для тренажёра сочинения ЕГЭ по русскому.
 *
 * Создаёт 12 текстов в стиле реальных заданий ЕГЭ: художественный или
 * публицистический фрагмент на 250-400 слов + список из 2-3 проблем,
 * которые ученик может сформулировать в сочинении по К1.
 *
 * Темы выбраны из списка часто встречающихся на ЕГЭ:
 *   - подвиг и самопожертвование
 *   - роль искусства / книг / музыки
 *   - взаимоотношения человека и природы
 *   - историческая память
 *   - роль учителя / наставника
 *   - милосердие и сострадание
 *   - совесть и нравственный выбор
 *   - смысл жизни / профессиональное призвание
 *   - патриотизм и любовь к Родине
 *   - роль детства / воспоминаний
 *   - отношение к языку и культуре
 *   - истинные и ложные ценности
 *
 * Формат сохранения: EssayText в БД + JSON-файл в data/essays/ на случай пересоздания.
 *
 * Запуск:
 *   npx tsx scripts/generate-essay-texts.ts
 *
 * Стоимость: ~30 ₽ через Polza (Haiku). Длительность: ~5-10 минут.
 * Идемпотентен: если в БД уже есть 12+ текстов, пропускает.
 */

import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

const TOPICS = [
  { theme: "подвиг и самопожертвование на войне", context: "фрагмент воспоминаний о ветеране или военного эпизода" },
  { theme: "роль искусства и книг в жизни человека", context: "публицистический текст о культуре или чтении" },
  { theme: "взаимоотношения человека и природы", context: "художественный текст о встрече с природой" },
  { theme: "историческая память и связь поколений", context: "публицистический текст о памяти о прошлом" },
  { theme: "роль учителя и наставника", context: "воспоминания взрослого о своём учителе" },
  { theme: "милосердие и сострадание к незнакомцу", context: "случай из жизни, помощь чужому человеку" },
  { theme: "совесть и нравственный выбор в сложной ситуации", context: "художественный эпизод о моральной дилемме" },
  { theme: "смысл жизни и профессиональное призвание", context: "рассуждение о работе как о служении" },
  { theme: "патриотизм и любовь к малой родине", context: "воспоминания о родной деревне, городе, крае" },
  { theme: "роль детства и семейных воспоминаний", context: "рассказ о детстве, о семье, о доме" },
  { theme: "бережное отношение к родному языку", context: "публицистический текст о судьбе языка и речи" },
  { theme: "истинные и ложные ценности в современном мире", context: "рассуждение о том, что действительно важно" },
];

if (!process.env.POLZA_API_KEY) { console.error("❌ POLZA_API_KEY не задан."); process.exit(1); }
if (!process.env.DATABASE_URL)  { console.error("❌ DATABASE_URL не задан."); process.exit(1); }

const client = new OpenAI({
  apiKey: process.env.POLZA_API_KEY,
  baseURL: process.env.POLZA_BASE_URL || "https://polza.ai/api/v1",
});
const MODEL = process.env.POLZA_MODEL || "anthropic/claude-haiku-4.5";
const prisma = new PrismaClient();

const OUT_DIR = path.join("data", "essays");
fs.mkdirSync(OUT_DIR, { recursive: true });

const SYSTEM_PROMPT = `Ты — писатель, готовящий тексты для задания 27 ЕГЭ по русскому языку (сочинение).

Твоя задача — создавать художественные или публицистические тексты в стиле, характерном для заданий ФИПИ. Такие тексты пишут авторы вроде Астафьева, Пришвина, Гроссмана, Паустовского, Солоухина, Лихачёва, Гранина.

Требования к тексту:
- Объём: 250-400 слов, разделённых на 4-6 абзацев с нумерацией (1), (2), (3)...
- Живой, образный русский язык. Используй эпитеты, метафоры, но без вычурности.
- Одна главная сюжетная линия — рассуждение, воспоминание или короткий эпизод.
- Автор ясно транслирует свою позицию — она должна быть считываема из текста.
- Финал — оставляет читателя с мыслью, не с ответом.
- Проблемы, поднимаемые в тексте, должны быть НРАВСТВЕННЫМИ (не бытовыми, не научными).

К каждому тексту ты сформулируешь 2-3 возможные проблемы, которые ученик может выбрать для сочинения. Проблема — это вопрос, который автор ставит перед читателем. Формулируй в виде: "Проблема ..." или "В чём заключается ...?"

Формат ответа — строго JSON без markdown:
{
  "title": "Короткое рабочее название текста (для внутренней навигации)",
  "authorHint": "Стилистика напоминает <имя автора>",
  "body": "Полный текст, 4-6 абзацев с нумерацией (1) (2) (3)...",
  "problems": [
    "Проблема ...",
    "Проблема ...",
    "В чём заключается ...?"
  ]
}`;

async function generateOne(themeContext: typeof TOPICS[0]): Promise<{
  title: string; authorHint: string; body: string; problems: string[];
}> {
  const resp = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Тема: ${themeContext.theme}\nКонтекст: ${themeContext.context}\n\nСоздай текст. Только JSON, без markdown, без \`\`\`.`,
      },
    ],
  });
  const raw = (resp.choices[0]?.message?.content || "").replace(/```json\s*|\s*```/g, "").trim();
  return JSON.parse(raw);
}

async function main() {
  console.log(`\n📝 Генерирую 12 исходных текстов для тренажёра сочинения`);
  console.log(`   Модель: ${MODEL}`);
  console.log(`   Стоимость: ~30 ₽ через Polza\n`);

  const existing = await prisma.essayText.count();
  if (existing >= TOPICS.length) {
    console.log(`⏭️  В БД уже есть ${existing} текстов, пропускаю генерацию.`);
    console.log(`   Чтобы перегенерировать — удали их вручную через SQL.`);
    await prisma.$disconnect();
    return;
  }

  let created = 0, failed = 0;

  for (let i = 0; i < TOPICS.length; i++) {
    const topic = TOPICS[i];
    const filePath = path.join(OUT_DIR, `text-${String(i + 1).padStart(2, "0")}.json`);

    // Идемпотентность через файл
    if (fs.existsSync(filePath)) {
      console.log(`⏭️   ${i + 1}/12 «${topic.theme}» — уже сгенерирован`);
      continue;
    }

    try {
      console.log(`⚙️   ${i + 1}/12 «${topic.theme}»...`);
      const gen = await generateOne(topic);

      // Валидация
      const wordCount = gen.body.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount < 150 || wordCount > 500) {
        console.warn(`     ⚠️   странная длина текста ${wordCount} слов, но сохраняю`);
      }
      if (!Array.isArray(gen.problems) || gen.problems.length < 2) {
        throw new Error(`ожидалось 2-3 проблемы, получено ${gen.problems?.length ?? 0}`);
      }

      // Сохраняем файл + запись в БД
      fs.writeFileSync(filePath, JSON.stringify({ theme: topic.theme, ...gen }, null, 2));
      await prisma.essayText.create({
        data: {
          title: gen.title,
          authorHint: gen.authorHint,
          body: gen.body,
          problems: gen.problems as never,
          difficulty: 2,
        },
      });
      console.log(`     ✅  «${gen.title}» (${wordCount} слов)`);
      created++;
    } catch (err) {
      console.error(`     ❌  ${(err as Error).message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n🎉 Готово.`);
  console.log(`   Создано: ${created}`);
  console.log(`   Ошибок: ${failed}`);

  const total = await prisma.essayText.count();
  console.log(`   Всего в банке: ${total} текстов`);

  await prisma.$disconnect();
}

main().catch(async e => { console.error("Фатальная ошибка:", e); await prisma.$disconnect(); process.exit(1); });
