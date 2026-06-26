"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Languages, Sigma, Atom, Binary, Scale, BookOpenText, type LucideIcon } from "lucide-react";
import { useApp } from "@/lib/store";
import { CARDS, LIVE_KEYS, accentForKey } from "@/data/catalog";
import { prefersReducedMotion } from "@/lib/device-tier";

const ICONS: Record<string, LucideIcon> = {
  Languages,
  Sigma,
  Atom,
  Binary,
  Scale,
  BookOpenText,
};

/** Детерминированный псевдо-рандом (стабильный на маунт) — без скачков. */
function rand(seed: number) {
  const x = Math.sin(seed * 99.13 + 7.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Предметы-пузырьки. В свёрнутом виде — пилюля активного предмета.
 * По тапу: предметы вылетают пузырями по всему экрану и медленно хаотично
 * плавают; тап по пузырю выбирает предмет. Esc / клик по фону закрывают.
 */
export function SubjectBubbles() {
  const subjectKey = useApp((s) => s.subjectKey);
  const setSubject = useApp((s) => s.setSubject);
  const [open, setOpen] = React.useState(false);

  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => setReduce(prefersReducedMotion()), []);

  const liveCards = CARDS.filter((c) => LIVE_KEYS.includes(c.key));
  const active = liveCards.find((c) => c.key === subjectKey) ?? liveCards[0];
  const ActiveIcon = ICONS[active?.icon ?? ""] ?? Languages;

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(key: string) {
    setSubject(key);
    setOpen(false);
  }

  return (
    <>
      {/* свёрнутый вид — пилюля активного предмета */}
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="liquid-glass flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold text-hi transition-transform active:scale-95 md:px-3.5"
        title="Сменить предмет"
      >
        <ActiveIcon size={17} className="text-accent" />
        <span className="max-w-[92px] truncate md:max-w-none">{active?.short}</span>
        <ChevronDown size={14} className="text-lo" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Выбор предмета"
            className="fixed inset-0 z-[70] overflow-hidden"
            style={{
              background: "rgb(var(--scrim) / 0.42)",
              backdropFilter: "blur(14px) saturate(120%)",
              WebkitBackdropFilter: "blur(14px) saturate(120%)",
            }}
          >
            {/* подсказка сверху */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="pointer-events-none absolute inset-x-0 z-[1] text-center"
              style={{ top: "max(18px, env(safe-area-inset-top))" }}
            >
              <div className="font-hand text-[22px] text-accent">Выбери предмет</div>
              <div className="hud-label mt-1 text-[9px] text-lo">тапни по пузырю</div>
            </motion.div>

            {liveCards.map((c, i) => (
              <Bubble
                key={c.key}
                index={i}
                total={liveCards.length}
                title={c.short}
                topics={c.topics}
                icon={ICONS[c.icon] ?? Languages}
                accent={accentForKey(c.key).accent}
                isActive={c.key === subjectKey}
                reduce={reduce}
                onPick={() => pick(c.key)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({
  index,
  total,
  title,
  topics,
  icon: Icon,
  accent,
  isActive,
  reduce,
  onPick,
}: {
  index: number;
  total: number;
  title: string;
  topics: number;
  icon: LucideIcon;
  accent: string; // "r g b"
  isActive: boolean;
  reduce: boolean;
  onPick: () => void;
}) {
  // фиксируем «активность» на время жизни пузыря — чтобы выбранный пузырь
  // не прыгал в размере и не дорисовывал бейдж во время исчезновения оверлея
  const [activeFrozen] = React.useState(isActive);
  const showActive = activeFrozen;

  // стартовая раскладка: распределяем по сетке-разбросу, чтобы не слипались
  const cols = Math.ceil(Math.sqrt(total));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const rows = Math.ceil(total / cols);

  const baseLeft = ((col + 0.5) / cols) * 100;
  const baseTop = ((row + 0.5) / Math.max(1, rows)) * 76 + 12; // 12%..88%

  // лёгкий детерминированный сдвиг старта
  const jx = (rand(index + 1) - 0.5) * 14;
  const jy = (rand(index + 2) - 0.5) * 12;
  const left = Math.min(86, Math.max(14, baseLeft + jx));
  const top = Math.min(88, Math.max(14, baseTop + jy));

  // амплитуды и длительность дрейфа — у каждого свои, отсюда «хаос»
  const driftX = 26 + rand(index + 3) * 40; // px
  const driftY = 22 + rand(index + 4) * 38;
  const dur = 11 + rand(index + 5) * 9; // 11..20с — медленно
  const rot = 4 + rand(index + 6) * 6;
  const dir = rand(index + 7) > 0.5 ? 1 : -1;

  const size = showActive ? 104 : 92;

  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      className="absolute grid place-items-center rounded-full"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        // насыщенный матовый фон — БЕЗ backdrop-filter: blur на анимируемом
        // элементе пересчитывается каждый кадр и роняет fps на мобилке
        background: `radial-gradient(circle at 35% 30%, rgb(${accent} / 0.5), rgb(${accent} / 0.2)), rgb(var(--bg-1) / 0.55)`,
        border: `1.5px solid rgb(${accent} / ${showActive ? 0.95 : 0.55})`,
        boxShadow: showActive
          ? `0 0 34px -4px rgb(${accent} / 0.8), inset 0 1px 0 rgb(255 255 255 / 0.3)`
          : `0 14px 34px -16px rgb(${accent} / 0.7), inset 0 1px 0 rgb(255 255 255 / 0.25)`,
      }}
      // влёт из центра + бесконечный хаотичный дрейф (если не reduced-motion)
      initial={{ scale: 0, opacity: 0 }}
      animate={
        reduce
          ? { scale: 1, opacity: 1 }
          : {
              scale: 1,
              opacity: 1,
              x: [0, driftX * dir, -driftX * 0.6 * dir, 0],
              y: [0, -driftY * 0.7, driftY, 0],
              rotate: [0, rot * dir, -rot * dir, 0],
            }
      }
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        scale: { type: "spring", stiffness: 260, damping: 18, delay: 0.03 * index },
        opacity: { duration: 0.3, delay: 0.03 * index },
        ...(reduce
          ? {}
          : {
              x: { duration: dur, repeat: Infinity, ease: "easeInOut" },
              y: { duration: dur * 1.15, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: dur * 0.9, repeat: Infinity, ease: "easeInOut" },
            }),
      }}
      whileTap={{ scale: 0.9 }}
    >
      <span className="flex flex-col items-center gap-1 px-1 text-center">
        <Icon size={26} style={{ color: `rgb(${accent})` }} />
        <span className="text-[11px] font-bold leading-tight text-hi">{title}</span>
        <span className="hud-label text-[7.5px] text-lo">{topics} тем</span>
      </span>
      {showActive && (
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-[1px] text-[7px] font-bold"
          style={{ background: `rgb(${accent})`, color: "rgb(var(--bg-0))" }}
        >
          сейчас
        </span>
      )}
    </motion.button>
  );
}
