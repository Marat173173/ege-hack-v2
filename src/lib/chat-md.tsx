import * as React from "react";

/**
 * Мини-рендер маркдауна для пузырей чата: **жирный**, маркированные и
 * нумерованные списки, заголовки (### → жирный абзац), абзацы по пустой
 * строке. Строит React-ноды (НЕ innerHTML) — ответ LLM не может внедрить
 * разметку/скрипт. Всё вне поддержанного синтаксиса выводится как текст.
 */

function inline(text: string, keyBase: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <b key={`${keyBase}-b${i++}`} className="font-semibold text-hi">
        {m[1]}
      </b>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function renderChatMarkdown(text: string): React.ReactNode {
  const blocks = text
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <>
      {blocks.map((block, bi) => {
        const out: React.ReactNode[] = [];
        let list: string[] = [];
        let ordered = false;

        const flushList = (key: string) => {
          if (!list.length) return;
          const items = list;
          list = [];
          const cls = "m-0 mb-2 space-y-1 pl-4 last:mb-0 " + (ordered ? "list-decimal" : "list-disc");
          out.push(
            ordered ? (
              <ol key={key} className={cls}>
                {items.map((li, j) => (
                  <li key={j}>{inline(li, `${key}-${j}`)}</li>
                ))}
              </ol>
            ) : (
              <ul key={key} className={cls}>
                {items.map((li, j) => (
                  <li key={j}>{inline(li, `${key}-${j}`)}</li>
                ))}
              </ul>
            )
          );
        };

        block.split("\n").forEach((raw, li) => {
          const l = raw.trim();
          if (!l) return;
          const mItem = l.match(/^(?:([-•*])|(\d+)[.)])\s+(.+)$/);
          if (mItem) {
            if (!list.length) ordered = !!mItem[2];
            list.push(mItem[3]);
            return;
          }
          flushList(`l-${bi}-${li}`);
          const mHead = l.match(/^#{1,4}\s+(.+)$/);
          out.push(
            <p key={`p-${bi}-${li}`} className="m-0 mb-2 last:mb-0">
              {mHead ? (
                <b className="font-semibold text-hi">{inline(mHead[1], `h-${bi}-${li}`)}</b>
              ) : (
                inline(l, `t-${bi}-${li}`)
              )}
            </p>
          );
        });
        flushList(`l-${bi}-end`);
        return <React.Fragment key={bi}>{out}</React.Fragment>;
      })}
    </>
  );
}
