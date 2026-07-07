"use client";

import * as React from "react";
import {
  motion,
  animate,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  Zap,
  Flame,
  Timer,
  ArrowRight,
  Check,
  X,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { levelFromXp } from "@/lib/gamification";
import { LiquidGlass } from "@/components/ui/liquid-glass";

/**
 * «ИТОГИ ТРЕНИРОВКИ» — экран результатов среза (черновик).
 *
 * Стиль: паттерн «Before-After / reveal» из ui-ux-pro-max поверх нашего
 * тёмного liquid-glass бренда. Один hero-«ревил» (кольцо + счётчик %),
 * ряд стат, разбор ошибок, CTA внизу. Success = мятный, средний = янтарь,
 * низкий = красный — но цвет НИКОГДА не единственный носитель смысла
 * (везде дублируется текстом/иконкой) → AA в тёмной и светлой темах.
 *
 * Данные сессии приходят пропсами (см. Solve.tsx), стрик/уровень — из стора.
 */

/** Семантические цвета результата (те же, что уже в Solve.tsx). */
const SCORE = { high: "#5BE3B0", mid: "#FFC65B", low: "#FF5C6E" } as const;

export interface MistakeItem {
  code: string; // код ФИПИ, напр. "2.4"
  question: string;
  your: string; // выбранный вариант (текст)
  answer: string; // верный вариант (текст)
  hint: string; // разбор
}

export interface ResultsScreenProps {
  floorName: string;
  correct: number;
  total: number;
  seconds: number;
  xpGained: number;
  /** Прогноз балла ЕГЭ диапазоном (из score-model). Необязателен. */
  scoreRange?: { low: number; high: number };
  mistakes?: MistakeItem[];
  onNext: () => void; // «Дальше» — обычно finish()
  onBack?: () => void; // «к Шпилю»
  onAskTutor?: (m: MistakeItem) => void;
}

/** Цвет + текстовый вердикт по точности (цвет не единственный смысл). */
function verdict(pct: number): { color: string; label: string } {
  if (pct >= 80) return { color: SCORE.high, label: "Отличный срез" };
  if (pct >= 50) return { color: SCORE.mid, label: "Хороший результат" };
  return { color: SCORE.low, label: "Есть над чем поработать" };
}

/* ────────────────────────── КОЛЬЦО РЕЗУЛЬТАТА ────────────────────────── */

function ScoreRing({
  pct,
  correct,
  total,
  color,
}: {
  pct: number;
  correct: number;
  total: number;
  color: string;
}) {
  const reduce = useReducedMotion();
  const size = 168;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(1, pct / 100));

  // пружинное заполнение (как в XpRing); при reduced-motion — сразу финал
  const mv = useSpring(reduce ? target : 0, { stiffness: 90, damping: 20 });
  React.useEffect(() => {
    mv.set(target);
  }, [target, mv]);
  const dashoffset = useTransform(mv, (v) => circ * (1 - v));

  // счётчик процента (гасится при reduced-motion)
  const [disp, setDisp] = React.useState(reduce ? pct : 0);
  React.useEffect(() => {
    if (reduce) {
      setDisp(pct);
      return;
    }
    const controls = animate(0, pct, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setDisp(Math.round(v)),
    });
    return () => controls.stop();
  }, [pct, reduce]);

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Точность ${pct}%: ${correct} из ${total} верно`}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--glass-hi) / 0.12)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          style={{ strokeDashoffset: dashoffset, filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {/* крупное число — Alfa Slab (display); текст-hi гарантирует AA */}
        <div>
          <div className="font-serif text-[44px] leading-none text-hi">
            {disp}
            <span className="text-[22px] align-top">%</span>
          </div>
          <div className="mt-1 font-mono text-[12px] tabular-nums text-mid">
            {correct}/{total} верно
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── СТАТ-ТАЙЛ ────────────────────────────── */

function StatTile({
  icon: Icon,
  value,
  label,
  delay,
  reduce,
}: {
  icon: typeof Zap;
  value: string;
  label: string;
  delay: number;
  reduce: boolean | null;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 22 }}
      className="flex-1"
    >
      <LiquidGlass className="flex flex-col items-center gap-1 rounded-2xl px-2 py-3">
        <Icon size={17} className="text-mid" aria-hidden="true" />
        {/* значение — text-hi + табличные цифры (не прыгают) */}
        <div className="font-mono text-[17px] font-bold tabular-nums text-hi">{value}</div>
        <div className="font-mono text-[9px] uppercase tracking-wider text-mid">{label}</div>
      </LiquidGlass>
    </motion.div>
  );
}

/* ──────────────────────────────── ЭКРАН ──────────────────────────────── */

export function ResultsScreen({
  floorName,
  correct,
  total,
  seconds,
  xpGained,
  scoreRange,
  mistakes = [],
  onNext,
  onBack,
  onAskTutor,
}: ResultsScreenProps) {
  const reduce = useReducedMotion();
  const streak = useApp((s) => s.game.streak);
  const xp = useApp((s) => s.game.xp);
  const level = levelFromXp(xp);

  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const v = verdict(pct);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const rise = (delay: number) =>
    reduce
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, type: "spring" as const, stiffness: 180, damping: 22 },
        };

  return (
    <div className="thin-scroll relative min-h-[100dvh] w-full overflow-y-auto bg-bg-0 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4">
        {/* лейбл */}
        <motion.div {...rise(0)} className="text-center">
          <div className="hud-label text-[10px] text-accent">Итоги · {floorName}</div>
        </motion.div>

        {/* HERO: кольцо + прогноз + вердикт */}
        <motion.div {...rise(0.05)}>
          <LiquidGlass sheen className="flex flex-col items-center gap-3 rounded-2xl px-5 py-6">
            <ScoreRing pct={pct} correct={correct} total={total} color={v.color} />

            {/* балл диапазоном (наш «диапазон прогноза») */}
            {scoreRange && (
              <div className="text-center">
                <div className="font-mono text-[10px] uppercase tracking-wider text-mid">
                  Прогноз ЕГЭ
                </div>
                <div className="mt-0.5 font-serif text-[26px] leading-none text-hi tabular-nums">
                  {scoreRange.low}
                  <span className="mx-1 text-mid">–</span>
                  {scoreRange.high}
                  <span className="ml-1.5 font-sans text-[13px] text-mid">баллов</span>
                </div>
              </div>
            )}

            {/* текстовый вердикт (text-hi = AA) + цветной маркер отдельно */}
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: v.color }}
              />
              <span className="text-[14px] font-semibold text-hi">{v.label}</span>
            </div>
          </LiquidGlass>
        </motion.div>

        {/* РЯД СТАТ */}
        <div className="flex gap-2.5">
          <StatTile icon={Zap} value={`+${xpGained}`} label="XP" delay={0.12} reduce={reduce} />
          <StatTile icon={Flame} value={String(streak)} label="Стрик" delay={0.18} reduce={reduce} />
          <StatTile icon={Timer} value={`${mm}:${ss}`} label="Время" delay={0.24} reduce={reduce} />
        </div>

        {/* РАЗБОР ОШИБОК */}
        <motion.div {...rise(0.3)} className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="m-0 text-[14px] font-semibold text-hi">Разбор ошибок</h2>
            <span className="font-mono text-[11px] tabular-nums text-mid">
              {mistakes.length}
            </span>
          </div>

          {mistakes.length === 0 ? (
            // empty-state (правило ux: не пустой экран)
            <LiquidGlass className="flex flex-col items-center gap-1.5 rounded-2xl px-5 py-6 text-center">
              <div className="grid h-10 w-10 place-items-center rounded-full" style={{ background: `${SCORE.high}22` }}>
                <Check size={20} style={{ color: SCORE.high }} />
              </div>
              <div className="text-[14px] font-semibold text-hi">Ошибок нет — чисто!</div>
              <p className="m-0 max-w-[260px] text-[12px] leading-snug text-mid">
                Весь срез без промахов. Так держать — следующий этаж уже ждёт.
              </p>
            </LiquidGlass>
          ) : (
            mistakes.map((m, i) => (
              <div
                key={`${m.code}-${i}`}
                className="rounded-2xl border border-line bg-[rgb(var(--hi)/0.02)] p-3.5"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-[rgb(var(--hi)/0.06)] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-mid">
                    {m.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-hi">{m.question}</span>
                </div>

                {/* индикатор ИКОНКОЙ + label, текст — нейтральный (AA в обеих темах) */}
                <div className="flex flex-col gap-1 text-[12.5px]">
                  <div className="flex items-start gap-1.5">
                    <X size={14} className="mt-0.5 shrink-0" style={{ color: SCORE.low }} aria-hidden="true" />
                    <span className="text-mid">
                      <span className="text-mid">ты:</span> {m.your}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check size={14} className="mt-0.5 shrink-0" style={{ color: SCORE.high }} aria-hidden="true" />
                    <span className="text-hi">
                      <span className="text-mid">верно:</span> {m.answer}
                    </span>
                  </div>
                </div>

                <p className="m-0 mt-2 text-[12px] leading-snug text-mid">{m.hint}</p>

                {onAskTutor && (
                  <button
                    type="button"
                    onClick={() => onAskTutor(m)}
                    className="mt-2 flex min-h-[44px] items-center gap-1.5 text-[12.5px] text-mid transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 rounded-md -ml-1 px-1"
                  >
                    <MessageCircle size={14} /> Разобрать с репетитором
                  </button>
                )}
              </div>
            ))
          )}
        </motion.div>

        {/* CTA */}
        <motion.div {...rise(0.36)} className="mt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={onNext}
            className="glossy-btn flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
          >
            Дальше <ArrowRight size={16} />
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-[44px] w-full items-center justify-center gap-1.5 text-[13px] text-mid transition-colors hover:text-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0 rounded-md"
            >
              <Sparkles size={13} /> к Шпилю
            </button>
          )}
        </motion.div>

        {/* тонкая подпись уровня — контекст без шума */}
        <div className="pb-2 text-center font-mono text-[10px] text-mid">
          уровень {level} · всего {xp} XP
        </div>
      </div>
    </div>
  );
}
