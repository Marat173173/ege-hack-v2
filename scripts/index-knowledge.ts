/**
 * Скрипт индексации сгенерированных материалов в БД.
 *
 * Читает все JSON из data/generated/ru/, для каждого фрагмента считает
 * эмбеддинг через Polza API (батчами по 50, для скорости и экономии)
 * и сохраняет в таблицу KnowledgeChunk.
 *
 * Запуск:
 *   POLZA_API_KEY=sk-... DATABASE_URL=postgres://... npx tsx scripts/index-knowledge.ts
 *
 * Идемпотентен: повторный запуск заменяет существующие записи
 * по детерминированному ID `ru-{topicCode}-{kind}`.
 */

import * as fs from "fs";
import * as path from "path";
import { embedBatch } from "../src/lib/rag/embeddings";
import { upsertChunk } from "../src/lib/rag/search";

const IN_DIR = path.join("data", "generated", "ru");
const SUBJECT = "russian";
const BATCH_SIZE = 50; // Polza/OpenAI поддерживают до 2048, но 50 — разумный баланс

type Material = { kind: string; title: string; text: string };

type TopicOutput = {
  topicCode: string;
  topicTitle: string;
  parent: string | null;
  materials: Material[];
};

type ChunkToIndex = {
  id: string;
  subject: string;
  topicId: string | null;
  topicCode: string;
  kind: string;
  title: string;
  text: string;
  fullText: string;
};

async function main() {
  if (!process.env.POLZA_API_KEY) {
    console.error("❌ Не задан POLZA_API_KEY.");
    process.exit(1);
  }

  if (!fs.existsSync(IN_DIR)) {
    console.error(`❌ Папка ${IN_DIR} не найдена. Сначала запусти generate-materials.ts`);
    process.exit(1);
  }

  // 1. Собираем все фрагменты в плоский список
  const files = fs.readdirSync(IN_DIR).filter((f) => f.endsWith(".json"));
  console.log(`📂 Найдено ${files.length} файлов с материалами\n`);

  const chunks: ChunkToIndex[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(IN_DIR, file), "utf8");
    const data = JSON.parse(raw) as TopicOutput;
    for (const m of data.materials) {
      chunks.push({
        id: `ru-${data.topicCode.replace(/\./g, "_")}-${m.kind}`,
        subject: SUBJECT,
        topicId: data.parent,
        topicCode: data.topicCode,
        kind: m.kind,
        title: m.title,
        text: m.text,
        fullText: `${m.title}\n\n${m.text}`,
      });
    }
  }
  console.log(`📦 Всего ${chunks.length} фрагментов на индексацию\n`);

  let indexed = 0;
  let failed = 0;

  // 2. Идём батчами
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    console.log(`⚙️  батч ${i / BATCH_SIZE + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${batch.length} фрагментов)`);

    try {
      // 2a. Получаем эмбеддинги одним запросом
      const vectors = await embedBatch(batch.map((c) => c.fullText));

      // 2b. Сохраняем в БД по очереди (upsertChunk делает свой INSERT)
      for (let j = 0; j < batch.length; j++) {
        try {
          await upsertChunk({ ...batch[j], source: "claude-generated", embedding: vectors[j] });
          indexed++;
        } catch (err) {
          console.error(`  ❌  ${batch[j].id}: ${(err as Error).message}`);
          failed++;
        }
      }
      console.log(`  ✅  ${indexed} всего проиндексировано`);
    } catch (err) {
      console.error(`  ❌  батч упал: ${(err as Error).message}`);
      failed += batch.length;
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
