"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import { useAnonAskCount } from "./useAnonAskCount";

type Msg = { id: string; role: "user" | "assistant"; content: string; loading?: boolean };

const STARTERS: { label: string; q: string }[] = [
  { label: "Н и НН в причастиях", q: "Объясни простыми словами, когда в причастиях пишется Н, а когда НН" },
  { label: "Запятая перед «и»", q: "Когда ставится запятая перед союзом «и»?" },
  { label: "Чередующиеся гласные", q: "Как запомнить чередующиеся гласные в корне?" },
  { label: "Тире между подлежащим и сказуемым", q: "Когда ставится тире между подлежащим и сказуемым?" },
];

export function TutorChat() {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [showSignup, setShowSignup] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const anon = useAnonAskCount();

  // автоскролл вниз при новом сообщении
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // фокус в поле при загрузке
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    if (anon.blocked) {
      setShowSignup(true);
      return;
    }

    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: q };
    const loadingMsg: Msg = { id: `a-${Date.now()}`, role: "assistant", content: "", loading: true };
    setMessages((m) => [...m, userMsg, loadingMsg]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/tutor/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          subject: "russian",
          history: messages
            .filter((m) => !m.loading)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const answer = data.answer || data.error || "Не удалось получить ответ. Попробуй ещё раз.";

      setMessages((prev) =>
        prev.map((m) => (m.id === loadingMsg.id ? { ...m, content: answer, loading: false } : m))
      );
      anon.increment();

      // после 3-го вопроса покажем приглашение к регистрации
      if (anon.count + 1 >= anon.limit) {
        setTimeout(() => setShowSignup(true), 800);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: "Ошибка соединения. Проверь интернет и попробуй ещё раз.", loading: false }
            : m
        )
      );
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-[rgb(var(--bg-0))]">
      {/* Шапка */}
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-6">
        <a
          href="/"
          className="flex items-center gap-2 text-sm text-[rgb(var(--mid))] transition hover:text-[rgb(var(--hi))]"
        >
          <X className="h-4 w-4" /> На главную
        </a>
        <div className="flex items-center gap-2 text-[rgb(var(--hi))]">
          <Sparkles className="h-4 w-4 text-[rgb(var(--accent))]" />
          <span className="font-medium">ИИ-репетитор</span>
        </div>
        <div className="text-xs text-[rgb(var(--lo))]">
          {anon.hydrated ? `Осталось: ${anon.remaining}/${anon.limit}` : ""}
        </div>
      </header>

      {/* Сообщения */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {messages.length === 0 && <Welcome onPick={ask} />}

          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <Bubble key={m.id} msg={m} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Поле ввода */}
      <div className="border-t border-white/5 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="relative flex items-end gap-2 rounded-2xl border border-white/10 bg-[rgb(var(--bg-1))] p-2 focus-within:border-[rgb(var(--accent))]/40">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                anon.blocked
                  ? "Зарегистрируйся, чтобы продолжить →"
                  : "Спроси о русском языке: правило, разбор задания, типичная ошибка…"
              }
              rows={1}
              disabled={pending || anon.blocked}
              className="flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-[rgb(var(--hi))] placeholder:text-[rgb(var(--lo))] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              style={{ maxHeight: "200px" }}
            />
            <button
              onClick={() => ask(input)}
              disabled={pending || !input.trim() || anon.blocked}
              className="grid h-10 w-10 place-items-center rounded-xl bg-[rgb(var(--accent))] text-[rgb(var(--bg-0))] transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Отправить"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 px-1 text-center text-[11px] text-[rgb(var(--lo))]">
            Репетитор может ошибаться. Сверяй важное с учебником.
          </p>
        </div>
      </div>

      {/* Модалка регистрации */}
      <AnimatePresence>
        {showSignup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-[rgb(var(--scrim))]/70 backdrop-blur-sm"
            onClick={() => setShowSignup(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 max-w-md rounded-3xl border border-white/10 bg-[rgb(var(--bg-1))] p-6 shadow-2xl sm:p-8"
            >
              <Sparkles className="mx-auto mb-4 h-8 w-8 text-[rgb(var(--accent))]" />
              <h2 className="mb-2 text-center text-xl font-semibold text-[rgb(var(--hi))]">
                Полный доступ к репетитору
              </h2>
              <p className="mb-6 text-center text-[15px] leading-relaxed text-[rgb(var(--mid))]">
                Бесплатные 3 вопроса закончились. Зарегистрируйся — это бесплатно,
                и репетитор будет помнить твой прогресс и темы, над которыми ты работаешь.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="/?signup=1"
                  className="grid h-12 place-items-center rounded-xl bg-[rgb(var(--accent))] font-medium text-[rgb(var(--bg-0))] transition hover:brightness-110"
                >
                  Создать аккаунт
                </a>
                <button
                  onClick={() => setShowSignup(false)}
                  className="grid h-12 place-items-center rounded-xl border border-white/10 text-[rgb(var(--mid))] transition hover:bg-white/5"
                >
                  Позже
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Welcome({ onPick }: { onPick: (q: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-8 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[rgb(var(--accent))]/15">
        <MessageCircle className="h-7 w-7 text-[rgb(var(--accent))]" />
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-[rgb(var(--hi))]">
        Привет! Я твой репетитор по русскому.
      </h1>
      <p className="mb-8 text-[15px] text-[rgb(var(--mid))]">
        Спроси правило, попроси разобрать задание или объяснить типичную ошибку.
      </p>
      <div className="mx-auto grid max-w-md gap-2">
        <div className="mb-1 text-xs uppercase tracking-wide text-[rgb(var(--lo))]">
          С чего начать
        </div>
        {STARTERS.map((s) => (
          <button
            key={s.label}
            onClick={() => onPick(s.q)}
            className="rounded-xl border border-white/10 bg-[rgb(var(--bg-1))] px-4 py-3 text-left text-sm text-[rgb(var(--hi))] transition hover:border-[rgb(var(--accent))]/40 hover:bg-[rgb(var(--bg-2))]"
          >
            {s.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed sm:max-w-[75%] ${
          isUser
            ? "bg-[rgb(var(--accent))] text-[rgb(var(--bg-0))]"
            : "border border-white/10 bg-[rgb(var(--bg-1))] text-[rgb(var(--hi))]"
        }`}
      >
        {msg.loading ? (
          <div className="flex items-center gap-2 text-[rgb(var(--mid))]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Думаю…</span>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        )}
      </div>
    </motion.div>
  );
}
