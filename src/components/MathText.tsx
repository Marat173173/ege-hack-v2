"use client";

import * as React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Рендерит текст с математическими формулами.
 *
 * Поддерживаемые синтаксисы:
 *   $x^2 + y^2 = z^2$   — inline (в строке)
 *   $$\int f(x)\,dx$$   — block (отдельным блоком по центру)
 *   \\( ... \\)         — inline (альтернативный синтаксис)
 *   \\[ ... \\]         — block (альтернативный синтаксис)
 *
 * Всё остальное — обычный текст. Переносы строк сохраняются.
 *
 * Использование:
 *   <MathText>Найди корни: $x^2 - 5x + 6 = 0$</MathText>
 *
 * Ошибочные формулы (некорректный LaTeX) выводятся как есть, красным.
 */

interface Props {
  children?: React.ReactNode;
  /** Alias для children — если удобно передавать явно. */
  text?: string;
  /** Дополнительные классы для контейнера. */
  className?: string;
  /** Тег контейнера — по умолчанию span. */
  as?: "span" | "div" | "p";
}

type Segment =
  | { type: "text"; content: string }
  | { type: "math"; content: string; display: boolean };

/**
 * Разбивает текст на сегменты: обычный текст vs математика.
 * Сначала ищет $$...$$ и \\[...\\] (block), потом $...$ и \\(...\\) (inline).
 */
function parseSegments(input: string): Segment[] {
  const segments: Segment[] = [];
  const patterns: Array<{ regex: RegExp; display: boolean }> = [
    { regex: /\$\$([\s\S]+?)\$\$/g, display: true },
    { regex: /\\\[([\s\S]+?)\\\]/g, display: true },
    { regex: /(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, display: false },
    { regex: /\\\(([\s\S]+?)\\\)/g, display: false },
  ];

  // Собираем все совпадения с позициями
  const matches: Array<{ start: number; end: number; content: string; display: boolean }> = [];
  for (const { regex, display } of patterns) {
    let m;
    const rx = new RegExp(regex.source, regex.flags);
    while ((m = rx.exec(input)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, content: m[1], display });
    }
  }
  matches.sort((a, b) => a.start - b.start);

  // Убираем пересекающиеся: block имеет приоритет (он раньше был бы найден regex-ом)
  const filtered: typeof matches = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  // Собираем сегменты
  let pos = 0;
  for (const m of filtered) {
    if (m.start > pos) segments.push({ type: "text", content: input.slice(pos, m.start) });
    segments.push({ type: "math", content: m.content, display: m.display });
    pos = m.end;
  }
  if (pos < input.length) segments.push({ type: "text", content: input.slice(pos) });

  return segments;
}

function renderMath(content: string, display: boolean): string {
  try {
    return katex.renderToString(content, { throwOnError: false, displayMode: display });
  } catch {
    return `<span style="color:#F27B7B">${content}</span>`;
  }
}

export function MathText({ children, text, className, as = "span" }: Props) {
  const raw = typeof children === "string" ? children : text ?? "";
  const segments = React.useMemo(() => parseSegments(raw), [raw]);

  const Comp = as;

  // Если формул нет — просто возвращаем текст, без спанов
  if (segments.every((s) => s.type === "text")) {
    return <Comp className={className}>{raw}</Comp>;
  }

  return (
    <Comp className={className}>
      {segments.map((s, i) => {
        if (s.type === "text") {
          return (
            <React.Fragment key={i}>
              {s.content.split("\n").map((line, j, arr) => (
                <React.Fragment key={j}>
                  {line}
                  {j < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        }
        return (
          <span
            key={i}
            className={s.display ? "block my-2 text-center" : "inline-block"}
            dangerouslySetInnerHTML={{ __html: renderMath(s.content, s.display) }}
          />
        );
      })}
    </Comp>
  );
}
