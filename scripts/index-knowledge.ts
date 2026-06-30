/**
 * Скрипт индексации сгенерированных материалов в БД.
 *
 * Читает все JSON из data/generated/ru/, для каждого фрагмента считает
 * эмбеддинг (локальный MiniLM) и сохраняет в таблицу KnowledgeChunk.
 *
 * Запуск:
 *   DATABASE_URL=postgres://... npx tsx scripts/index-knowledge.ts
 *
 * Идемпотентен: если запустить повторно, заменит существующие записи
 * по детерминированному ID `ru-{topicCode}-{kind}`.
 */

import * as fs from "fs";
import * as path from "path";
import { embed } from "../src/lib/rag/embeddings";
import { upsertChunk } from "../src/lib/rag/search";

const IN_DIR = path.join("data", "generated", "ru");
const SUBJECT = "russian";

type Material = {
  kind: string;
  title: string;
  text: string;
};

type TopicOutput = {
  topicCode: string;
  topicTitle: string;
  parent: string | null;
  materials: Material[];
};

async function main() {
  if (!fs.existsSync(IN_DIR)) {
    console.error(`❌ Папка ${IN_DIR} не найдена. Сначала запусти generate-materials.ts`);
    process.exit(1);
  }

  const files = fs.readdirSync(IN_DIR).filter((f) => f.endsWith(".json"));
  console.log(`📂 Найдено ${files.length} файлов в ${IN_DIR}\n`);

  let indexed = 0;
  let failed = 0;

  // Прогреваем модель эмбеддингов (первый запуск скачивает её)
  console.log("⏳ Загружаю модель эмбеддингов (первый раз ~3-5 минут)...");
  await embed("прогрев модели");
  console.log("✅ Модель загружена\n");

  for (const file of files) {
    const raw = fs.readFileSync(path.join(IN_DIR, file), "utf8");
    const data = JSON.parse(raw) as TopicOutput;

    for (const m of data.materials) {
      const id = `ru-${data.topicCode.replace(/\./g, "_")}-${m.kind}`;
      const fullText = `${m.title}\n\n${m.text}`;

      try {
        const vec = await embed(fullText);
        await upsertChunk({
          id,
          subject: SUBJECT,
          topicId: data.parent,
          topicCode: data.topicCode,
          kind: m.kind,
          source: "claude-generated",
          title: m.title,
          text: m.text,
          embedding: vec,
        });
        indexed++;
        if (indexed % 10 === 0) console.log(`  ${indexed} фрагментов проиндексировано...`);
      } catch (err) {
        console.error(`❌  ${id}: ${(err as Error).message}`);
        failed++;
      }
    }
  }

  console.log(`\n🎉 Готово.`);
  console.log(`   Проиндексировано: ${indexed}`);
  console.log(`   Ошибок: ${failed}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Фатальная ошибка:", err);
  process.exit(1);
});
