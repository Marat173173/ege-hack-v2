"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, ChevronDown, ChevronUp, Info, AlertCircle } from "lucide-react";

/**
 * Экран /essay/[textId] — редактор сочинения.
 *
 * Устройство:
 *   - Шапка (крестик «Назад», название, счётчик слов)
 *   - Свёрнутый исходный текст (по умолчанию открыт, кнопка «Свернуть»)
 *   - Список 2-3 возможных проблем — для подсказки К1
 *   - Большая textarea редактора
 *   - Автосохранение в localStorage каждые 3 секунды
 *   - Кнопка «Отправить на проверку» → POST /api/essay/review → редирект на результат
 *
 * Валидация:
 *   - < 70 слов: кнопка disabled + подсказка
 *   - 70-150 слов: жёлтый маркер «мало для ЕГЭ», кнопка активна
 *   - 150-350 слов: зелёный маркер «оптимально»
 *   - > 350 слов: жёлтый маркер «многовато»
 *   - > 800 слов: красный + блокировка отправки
 */

interface Props {
  textId: string;
}

type SourceText = {
  id: string;
  title: string;
  authorHint: string | null;
  body: string;
  problems: string[];
};

const STORAGE_KEY = (textId: string) => `egehack.essay.draft.${textId}`;
const AUTOSAVE_MS = 3000;

export function EssayComposer({ textId }: Props) {
  const router = useRouter();
  const { status } = useSession();

  const [source, setSource] = React.useState<SourceText | null>(null);
  const [content, setContent] = React.useState("");
  const [textOpen, setTextOpen] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Загрузка исходника
  React.useEffect(() => {
    fetch(`/api/essay/text/${textId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Не удалось загрузить текст");
        return data;
      })
      .then((data) => setSource(data.text))
      .catch((e) => setLoadError(e.message));
  }, [textId]);

  // Загрузка черновика из localStorage
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY(textId));
      if (saved) setContent(saved);
    } catch {/* приватный режим или что-то похожее */}
  }, [textId]);

  // Автосохранение
  React.useEffect(() => {
    if (!content) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY(textId), content);
      } catch {/* ignore */}
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [content, textId]);

  const wordCount = React.useMemo(
    () => content.trim().split(/\s+/).filter((w) => w.length > 0).length,
    [content]
  );

  const wordStatus = React.useMemo(() => {
    if (wordCount < 70) return { label: "мало для проверки", color: "text-red-400" };
    if (wordCount < 150) return { label: "мало для ЕГЭ", color: "text-yellow-400" };
    if (wordCount <= 350) return { label: "оптимально", color: "text-green-400" };
    if (wordCount <= 500) return { label: "многовато", color: "text-yellow-400" };
    if (wordCount <= 800) return { label: "многословно", color: "text-orange-400" };
    return { label: "слишком длинно", color: "text-red-400" };
  }, [wordCount]);

  const canSubmit = wordCount >= 70 && wordCount <= 800 && !submitting && status === "authenticated";

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/essay/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ textId, content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось проверить сочинение");
        setSubmitting(false);
        return;
      }
      // Черновик больше не нужен — очищаем
      try { window.localStorage.removeItem(STORAGE_KEY(textId)); } catch {/* ignore */}
      router.push(`/essay/attempt/${data.attemptId}`);
    } catch {
      setError("Ошибка соединения. Попробуй ещё раз.");
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="min-h-[100dvh] bg-[rgb(var(--bg-0))] p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <div className="mb-4 text-[14px] text-[rgb(var(--hi))]">{loadError}</div>
          <Link href="/essay" className="text-[13px] text-[rgb(var(--accent))] underline">
            К списку текстов
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[rgb(var(--bg-0))] pb-32">
      {/* Шапка */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[rgb(var(--bg-0))]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-3 sm:px-6">
          <Link
            href="/essay"
            className="flex items-center gap-2 text-sm text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))]"
          >
            <X className="h-4 w-4" /> Тексты
          </Link>
          <div className="truncate px-3 text-[13px] font-medium text-[rgb(var(--hi))] sm:text-[14px]">
            {source?.title ?? "…"}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11.5px]">
            <span className={wordStatus.color}>{wordCount}</span>
            <span className="hidden text-[rgb(var(--lo))] sm:inline">слов · {wordStatus.label}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-3 pt-4 sm:px-6 sm:pt-6">
        {/* Исходный текст, свёрнутый */}
        {source && (
          <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-[rgb(var(--bg-1))]">
            <button
              onClick={() => setTextOpen((v) => !v)}
              className="flex w-full items-center justify-between border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
                  Исходный текст
                </span>
                {source.authorHint && (
                  <span className="text-[11px] italic text-[rgb(var(--lo))]">
                    · {source.authorHint}
                  </span>
                )}
              </div>
              {textOpen ? (
                <ChevronUp size={16} className="text-[rgb(var(--mid))]" />
              ) : (
                <ChevronDown size={16} className="text-[rgb(var(--mid))]" />
              )}
            </button>
            <AnimatePresence initial={false}>
              {textOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="whitespace-pre-line px-4 py-4 text-[14px] leading-relaxed text-[rgb(var(--hi))] sm:px-5 sm:text-[14.5px]">
                    {source.body}
                  </div>

                  {source.problems.length > 0 && (
                    <div className="border-t border-white/5 bg-[rgb(var(--accent))]/[0.03] px-4 py-3 sm:px-5">
                      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[rgb(var(--lo))]">
                        <Info size={11} /> возможные проблемы для К1
                      </div>
                      <ul className="space-y-1 text-[12.5px] text-[rgb(var(--mid))]">
                        {source.problems.map((p, i) => (
                          <li key={i}>· {p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Редактор */}
        <div className="rounded-2xl border border-white/10 bg-[rgb(var(--bg-1))] p-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Напиши сочинение по этому тексту. Оптимально 150-350 слов. Автосохранение включено."
            spellCheck
            className="min-h-[400px] w-full resize-y rounded-xl bg-transparent p-4 text-[14.5px] leading-relaxed text-[rgb(var(--hi))] placeholder-[rgb(var(--lo))] outline-none sm:min-h-[500px] sm:text-[15px]"
          />
        </div>

        {/* Кнопка отправки */}
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/5 bg-[rgb(var(--bg-0))]/95 backdrop-blur">
          <div className="mx-auto max-w-3xl px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
            {error && (
              <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
                {error}
              </div>
            )}
            {status !== "authenticated" && (
              <div className="mb-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-[12.5px] text-yellow-300">
                Войди в аккаунт, чтобы отправить на проверку и сохранить результат.
              </div>
            )}
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[rgb(var(--accent))] px-4 py-3 text-[14px] font-semibold text-[rgb(var(--bg-0))] transition-transform hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Проверяем ~30 секунд…</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Отправить на проверку</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
