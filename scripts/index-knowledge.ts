/**
 * Индексация материалов в KnowledgeChunk + расчёт эмбеддингов через Polza.
 *
 * Читает data/generated/{subject}/*.json, батчами (по 50) считает эмбеддинги
 * (text-embedding-3-small через Polza, 1536-мерные), сохраняет в БД.
 *
 * Запуск:
 *   SUBJECT=russian    npm run rag:index
 *   SUBJECT=social     npm run rag:index
 *   и т.д.
 *
 * Идемпотентен: upsertChunk() перезаписывает по детерминированному id.
 */

import * as fs from "fs";
import * as path from "path";
import { embedBatch } from "../src/lib/rag/embeddings";
import { upsertChunk } from "../src/lib/rag/search";

const SUBJECT = (process.env.SUBJECT || "russian").toLowerCase();
const IN_DIR = path.join("data", "generated", SUBJECT);
const BATCH = 50;

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
    console.error("❌ POLZA_API_KEY не задан.");
    process.exit(1);
  }

  if (!fs.existsSync(IN_DIR)) {
    console.error(`❌ Папка ${IN_DIR} не найдена. Сначала: SUBJECT=${SUBJECT} npm run rag:generate`);
    process.exit(1);
  }

  const files = fs.readdirSync(IN_DIR).filter(f => f.endsWith(".json"));
  console.log(`📂 Найдено ${files.length} файлов в ${IN_DIR}\n`);

  const chunks: ChunkToIndex[] = [];
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(IN_DIR, f), "utf8")) as TopicOutput;
    for (const m of data.materials) {
      const codeSafe = data.topicCode.replace(/\./g, "_");
      chunks.push({
        id: `${SUBJECT}-${codeSafe}-${m.kind}`,
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

  let indexed = 0, failed = 0;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    console.log(`⚙️   батч ${Math.floor(i / BATCH) + 1}/${Math.ceil(chunks.length / BATCH)} (${batch.length})`);
    try {
      const vectors = await embedBatch(batch.map(c => c.fullText));
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

  console.log(`\n🎉 Готово.\n   Проиндексировано: ${indexed}\n   Ошибок: ${failed}`);
  process.exit(0);
}

main().catch(e => { console.error("Фатальная ошибка:", e); process.exit(1); });
