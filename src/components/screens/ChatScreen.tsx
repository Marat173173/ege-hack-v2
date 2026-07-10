"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Send, Bot, Users, ShieldAlert, Sparkles, RotateCcw } from "lucide-react";
import { useApp } from "@/lib/store";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { renderChatMarkdown } from "@/lib/chat-md";
import type { MistakeItem } from "@/components/screens/ResultsScreen";

type Tab = "ai" | "community";

interface Msg {
  id: number;
  who: "me" | "ai" | string; // имя для community
  text: string;
  hue?: number; // цвет аватара для community
  source?: string; // заголовок источника из RAG (только ai)
  retry?: boolean; // сообщение об ошибке сети с кнопкой «Повторить»
}

interface AskPayload {
  question: string;
  mode?: "review";
  mistakes?: MistakeItem[];
}

// последние 6 пар «вопрос-ответ» для контекста LLM
function buildHistory(msgs: Msg[]): { role: "user" | "assistant"; content: string }[] {
  return msgs
    .filter((m) => (m.who === "me" || m.who === "ai") && !m.retry)
    .slice(-12)
    .map((m) => ({
      role: m.who === "me" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));
}

const COMMUNITY_SEED: Msg[] = [
  { id: 1, who: "Алина", hue: 320, text: "кто как готовится к сочинению? у меня вечно К2 проседает 😭" },
  { id: 2, who: "Марк", hue: 200, text: "я делаю по 2 примера + фраза-связка, реально помогло поднять балл" },
  { id: 3, who: "Соня", hue: 150, text: "у меня серия 14 дней 🔥 кто больше?" },
  { id: 4, who: "Тимур", hue: 40, text: "параметр это боль… но разбор случаев спасает" },
];

export function ChatScreen() {
  const setScreen = useApp((s) => s.setScreen);
  const profile = useApp((s) => s.profile);
  const tutorNudge = useApp((s) => s.tutorNudge);
  const resolveNudge = useApp((s) => s.resolveNudge);

  const [tab, setTab] = React.useState<Tab>("ai");
  // pending-надж от наставника → вместо приветствия предлагаем разбор теста
  const [nudgePrompt, setNudgePrompt] = React.useState(tutorNudge?.status === "pending");
  const [aiMsgs, setAiMsgs] = React.useState<Msg[]>(() =>
    tutorNudge?.status === "pending"
      ? [
          {
            id: 0,
            who: "ai",
            text: `Давай разберём твой тест по „${tutorNudge.floorName}“ — там ты ответил ${tutorNudge.correct ?? 0}/${tutorNudge.total ?? 0}. Пройдёмся подробнее?`,
          },
        ]
      : [
          {
            id: 0,
            who: "ai",
            text: `Привет, ${profile.name}! Я твой ИИ-наставник. Спроси что угодно по ЕГЭ — разберём по критериям ФИПИ.`,
          },
        ]
  );
  const [commMsgs, setCommMsgs] = React.useState<Msg[]>(COMMUNITY_SEED);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const seq = React.useRef(100);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const lastAskRef = React.useRef<AskPayload | null>(null);
  // высота визуального вьюпорта: на iOS клавиатура НЕ сжимает 100dvh, поэтому
  // привязываем высоту экрана к visualViewport — иначе поле ввода и последние
  // сообщения уезжают под клавиатуру.
  const [vh, setVh] = React.useState<number | null>(null);

  const msgs = tab === "ai" ? aiMsgs : commMsgs;

  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setVh(vv.height);
    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing, tab, vh]);

  // обрываем запрос к наставнику при размонтировании (уход с экрана)
  React.useEffect(() => () => abortRef.current?.abort(), []);

  // ключ реестра ("rus") → предмет RAG-базы ("russian"); пока живой только русский
  const RAG_SUBJECT: Record<string, string> = { rus: "russian" };

  async function askTutor(payload: AskPayload) {
    lastAskRef.current = payload;
    setTyping(true);
    abortRef.current?.abort(); // не копим параллельные запросы
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/tutor/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: payload.question,
          subject: RAG_SUBJECT[tutorNudge?.subjectKey ?? "rus"] ?? "russian",
          history: buildHistory(aiMsgs),
          ...(payload.mistakes ? { mistakes: payload.mistakes } : {}),
          ...(payload.mode ? { mode: payload.mode } : {}),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { answer: string; sources?: { title?: string }[] };
      setAiMsgs((m) => [
        ...m,
        { id: ++seq.current, who: "ai", text: data.answer, source: data.sources?.[0]?.title },
      ]);
    } catch {
      if (ctrl.signal.aborted) return;
      setAiMsgs((m) => [
        ...m,
        { id: ++seq.current, who: "ai", text: "Не получилось связаться. Попробуй ещё раз.", retry: true },
      ]);
    } finally {
      if (!ctrl.signal.aborted) setTyping(false);
    }
  }

  function retryAsk() {
    const p = lastAskRef.current;
    if (p && !typing) void askTutor(p);
  }

  function acceptReview() {
    const n = tutorNudge;
    if (!n || typing) return; // guard: параллельно с обычным вопросом не шлём
    setNudgePrompt(false);
    resolveNudge("accepted");
    setAiMsgs((m) => [...m, { id: ++seq.current, who: "me", text: "Давай" }]);
    void askTutor({
      question: `Разбери мои ошибки из теста по „${n.floorName}“`,
      mode: "review",
      mistakes: n.mistakes,
    });
  }

  function declineReview() {
    setNudgePrompt(false);
    resolveNudge("declined");
    setAiMsgs((m) => [
      ...m,
      { id: ++seq.current, who: "ai", text: "Ок! Если захочешь разобрать — я тут. Возвращайся 👋" },
    ]);
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    if (tab === "ai" && typing) return;
    setInput("");
    const mine: Msg = { id: ++seq.current, who: "me", text };
    if (tab === "ai") {
      setAiMsgs((m) => [...m, mine]);
      void askTutor({ question: text });
    } else {
      setCommMsgs((m) => [...m, { ...mine, hue: profile.avatarHue }]);
    }
  }

  return (
    <div
      className="flex h-[100dvh] w-full flex-col bg-bg-0"
      style={vh ? { height: `${vh}px` } : undefined}
    >
      {/* header */}
      <header
        className="z-10 flex items-center justify-between border-b border-line bg-bg-0/85 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => setScreen("spire")}
          className="-ml-2 flex min-h-[44px] items-center gap-1.5 px-2 text-[13px] text-mid transition-colors hover:text-hi"
        >
          <ArrowLeft size={16} /> к Шпилю
        </button>
        <div className="hud-label text-[11px] text-lo">Сообщения</div>
        <div className="w-[70px]" />
      </header>

      {/* tabs */}
      <div className="flex gap-1.5 border-b border-line px-4 py-2.5">
        {([
          ["ai", "ИИ-наставник", Bot],
          ["community", "Чат учеников", Users],
        ] as const).map(([k, label, Ico]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors"
            style={{
              background: tab === k ? "rgb(var(--accent)/0.14)" : "transparent",
              color: tab === k ? "rgb(var(--accent))" : "rgb(var(--mid))",
            }}
          >
            <Ico size={15} /> {label}
          </button>
        ))}
      </div>

      {/* предупреждение про модерацию в общем чате */}
      {tab === "community" && (
        <div className="flex items-start gap-2 border-b border-warn/20 bg-warn/[0.06] px-4 py-2.5">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-warn" />
          <p className="m-0 text-[11px] leading-snug text-mid">
            Демо-чат сообщества. На проде здесь работает модерация и защита несовершеннолетних —
            сообщения не уходят незнакомым людям без проверки.
          </p>
        </div>
      )}

      {/* messages */}
      <div ref={scrollRef} className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.map((m) => {
          const mine = m.who === "me";
          const isAi = m.who === "ai";
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={"flex items-end gap-2 " + (mine ? "flex-row-reverse" : "")}
            >
              {!mine && (
                <div
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px]"
                  style={{
                    background: isAi
                      ? "rgb(var(--accent)/0.16)"
                      : `hsl(${m.hue ?? 200} 65% 55% / 0.18)`,
                    border: isAi
                      ? "1px solid rgb(var(--accent)/0.5)"
                      : `1px solid hsl(${m.hue ?? 200} 65% 55% / 0.5)`,
                  }}
                >
                  {isAi ? <Bot size={14} className="text-accent" /> : (m.who as string)[0]}
                </div>
              )}
              <div className="max-w-[78%]">
                {!mine && !isAi && (
                  <div className="mb-0.5 ml-1 text-[12px] text-mid">{m.who}</div>
                )}
                <div
                  className={
                    "ink-readable rounded-2xl px-3.5 py-2.5 " +
                    // длинные разборы ИИ — обычным шрифтом (почерк нечитаем на
                    // объёме); короткие реплики ученика — «от руки», живо
                    (isAi ? "text-[14px] leading-relaxed" : "font-hand text-[18px] leading-tight")
                  }
                  style={{
                    background: mine
                      ? "rgb(var(--accent))"
                      : "rgb(var(--glass-hi)/0.05)",
                    // фиксированные тёмные чернила: rgb(var(--bg-0)) в светлой
                    // теме давал контраст 1.27:1 на янтарной заливке
                    color: mine ? "#070a14" : "rgb(var(--hi))",
                    border: mine ? "none" : "1px solid rgb(var(--line)/0.4)",
                    borderBottomRightRadius: mine ? 6 : undefined,
                    borderBottomLeftRadius: !mine ? 6 : undefined,
                  }}
                >
                  {/* ответы ИИ рендерим как маркдаун (жирный/списки/абзацы) —
                      LLM отвечает разметкой, голые ** нечитаемы */}
                  {isAi ? renderChatMarkdown(m.text) : m.text}
                  {m.source && (
                    <div className="mt-1 font-sans text-[11px] text-lo">Источник: {m.source}</div>
                  )}
                </div>
                {m.retry && (
                  <button
                    onClick={retryAsk}
                    disabled={typing}
                    className="mt-1.5 ml-1 flex min-h-[36px] items-center gap-1.5 rounded-full border border-line bg-[rgb(var(--glass-hi)/0.03)] px-3 py-1.5 text-[12.5px] text-mid transition-colors hover:border-accent/40 hover:text-hi disabled:opacity-40"
                  >
                    <RotateCcw size={12} className="text-accent" /> Повторить
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* индикатор «печатает» */}
        <AnimatePresence>
          {typing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-end gap-2"
            >
              <div className="grid h-7 w-7 place-items-center rounded-full border border-accent/50 bg-accent/[0.16]">
                <Bot size={14} className="text-accent" />
              </div>
              <div className="flex gap-1 rounded-2xl border border-line bg-[rgb(var(--glass-hi)/0.05)] px-3 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-mid"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* предвыбор разбора теста (pending-надж) */}
      {tab === "ai" && nudgePrompt && (
        <div className="flex gap-2 border-t border-line px-4 py-2.5">
          <button
            onClick={acceptReview}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-accent/50 bg-accent/[0.12] px-4 text-[14px] font-semibold text-accent transition-colors hover:bg-accent/[0.2] active:bg-accent/[0.2]"
          >
            <Sparkles size={13} /> Давай
          </button>
          <button
            onClick={declineReview}
            className="flex h-11 flex-1 items-center justify-center rounded-full border border-line bg-[rgb(var(--glass-hi)/0.03)] px-4 text-[14px] font-semibold text-mid transition-colors hover:border-accent/40 hover:text-hi active:border-accent/40"
          >
            Нет, спасибо
          </button>
        </div>
      )}

      {/* быстрые подсказки (только ИИ) */}
      {tab === "ai" && !nudgePrompt && (
        <div className="flex gap-2 overflow-x-auto border-t border-line px-4 py-2.5">
          {["Разбери моё сочинение", "Как добрать К2?", "Объясни задачу с параметром"].map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-full border border-line bg-[rgb(var(--glass-hi)/0.03)] px-3.5 py-2 text-[12.5px] text-mid transition-colors hover:border-accent/40 hover:text-hi active:border-accent/40"
            >
              <Sparkles size={11} className="text-accent" /> {q}
            </button>
          ))}
        </div>
      )}

      {/* input */}
      <div
        className="px-3 pt-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <LiquidGlass className="flex items-center gap-2 rounded-2xl p-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            onFocus={() =>
              // даём клавиатуре/visualViewport устаканиться, затем прокручиваем
              // ленту вниз, чтобы поле и последние сообщения были видны
              setTimeout(
                () =>
                  scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
                250
              )
            }
            aria-label="Сообщение"
            placeholder={tab === "ai" ? "Спроси ИИ-наставника…" : "Сообщение в чат…"}
            className="flex-1 bg-transparent px-3 py-2.5 text-[16px] text-hi placeholder:text-lo"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="glossy-btn grid h-11 w-11 shrink-0 place-items-center rounded-xl disabled:opacity-40"
            aria-label="Отправить"
          >
            <Send size={17} />
          </button>
        </LiquidGlass>
      </div>
    </div>
  );
}
