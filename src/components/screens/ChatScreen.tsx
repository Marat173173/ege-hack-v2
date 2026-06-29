"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Send, Bot, Users, ShieldAlert, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { LiquidGlass } from "@/components/ui/liquid-glass";

type Tab = "ai" | "community";

interface Msg {
  id: number;
  who: "me" | "ai" | string; // имя для community
  text: string;
  hue?: number; // цвет аватара для community
}

// мок-ответы ИИ-наставника по ключевым словам (реальный LLM подключается позже)
function aiReply(q: string): string {
  const t = q.toLowerCase();
  if (/сочин|к2|пример|связ/.test(t))
    return "В сочинении главный недобор — пояснение связи между примерами (К2). Приведи два примера-иллюстрации и одной фразой объясни, как они работают вместе: «противопоставляя… автор показывает…». Это +1–3 балла. Хочешь, разберём на твоём тексте?";
  if (/парам|a<0|случа|дискрим/.test(t))
    return "В задаче с параметром чаще всего теряют балл на неразобранном случае (например a < 0) и на арифметике в конце. Выпиши ВСЕ случаи отдельно и проверь ответ подстановкой. Скинь своё решение — найду, где просел.";
  if (/ударени|орфо|правопис/.test(t))
    return "Орфография (задания 9–15): сначала отсекай слова на чередование и исключения — это «ловушки» задания. Правило сильнее, чем слух: «загорать» → без ударения О. Прислать тебе 5 заданий на тренировку?";
  if (/привет|здоров|hi|hello/.test(t))
    return "Привет! Я твой ИИ-наставник по ЕГЭ. Спроси про любую тему — орфография, сочинение, задача с параметром — или скинь своё решение, разберём по критериям ФИПИ.";
  if (/балл|прогноз|сколько/.test(t))
    return "Прогноз балла я показываю диапазоном, а не точной цифрой — чем стабильнее темы, тем у́же диапазон. Чтобы поднять нижнюю границу, укрепляй дрожащие зоны: они дают самый быстрый прирост.";
  return "Понял вопрос. По теме ЕГЭ помогу разобрать критерии, типичные ошибки и дать практику. Уточни тему или пришли своё решение — дам конкретные шаги к максимуму. (В демо ответы заготовлены; на проде здесь работает ИИ по критериям ФИПИ.)";
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

  const [tab, setTab] = React.useState<Tab>("ai");
  const [aiMsgs, setAiMsgs] = React.useState<Msg[]>([
    { id: 0, who: "ai", text: `Привет, ${profile.name}! Я твой ИИ-наставник. Спроси что угодно по ЕГЭ — разберём по критериям ФИПИ.` },
  ]);
  const [commMsgs, setCommMsgs] = React.useState<Msg[]>(COMMUNITY_SEED);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const seq = React.useRef(100);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const replyTimer = React.useRef<ReturnType<typeof setTimeout>>();
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

  // чистим отложенный ответ ИИ при размонтировании (уход с экрана)
  React.useEffect(() => () => clearTimeout(replyTimer.current), []);

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const mine: Msg = { id: ++seq.current, who: "me", text };
    if (tab === "ai") {
      setAiMsgs((m) => [...m, mine]);
      setTyping(true);
      clearTimeout(replyTimer.current);
      replyTimer.current = setTimeout(() => {
        setAiMsgs((m) => [...m, { id: ++seq.current, who: "ai", text: aiReply(text) }]);
        setTyping(false);
      }, 700 + Math.random() * 600);
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
                  <div className="mb-0.5 ml-1 text-[10px] text-lo">{m.who}</div>
                )}
                <div
                  className={
                    "ink-readable rounded-2xl px-3.5 py-2.5 " +
                    // реплики ИИ-наставника — «от руки», крупнее для читаемости
                    (isAi ? "font-hand text-[18px] leading-tight" : "text-[14px] leading-snug")
                  }
                  style={{
                    background: mine
                      ? "rgb(var(--accent))"
                      : "rgb(var(--glass-hi)/0.05)",
                    color: mine ? "rgb(var(--bg-0))" : "rgb(var(--hi))",
                    border: mine ? "none" : "1px solid rgb(var(--line)/0.4)",
                    borderBottomRightRadius: mine ? 6 : undefined,
                    borderBottomLeftRadius: !mine ? 6 : undefined,
                  }}
                >
                  {m.text}
                </div>
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

      {/* быстрые подсказки (только ИИ) */}
      {tab === "ai" && (
        <div className="flex gap-2 overflow-x-auto border-t border-line px-4 py-2.5">
          {["Разбери моё сочинение", "Как добрать К2?", "Объясни задачу с параметром"].map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="flex min-h-[40px] shrink-0 items-center gap-1 rounded-full border border-line bg-[rgb(var(--glass-hi)/0.03)] px-3.5 py-2 text-[12px] text-mid transition-colors hover:border-accent/40 hover:text-hi active:border-accent/40"
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
            className="flex-1 bg-transparent px-3 py-2.5 text-[15px] text-hi outline-none placeholder:text-lo"
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
