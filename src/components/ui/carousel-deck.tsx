"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useIsMobile } from "@/lib/use-media";

export interface DeckCard {
  /** Бейдж-ярлык карточки (напр. «Теория», «К2», «Пример»). */
  badge: string;
  /** Заголовок карточки. */
  title: string;
  /** Текст (анимируется по словам с blur — как в шаблоне). */
  body: string;
  /** Доп. подпись под телом (опц.). */
  meta?: string;
  /** Акцентный цвет карточки (для грани стека). */
  accent?: string;
}

interface DeckColors {
  badge?: string;
  title?: string;
  body?: string;
  meta?: string;
  arrowBackground?: string;
  arrowForeground?: string;
  arrowHoverBackground?: string;
  cardFace?: string;
  cardBorder?: string;
}

interface DeckFontSizes {
  title?: string;
  body?: string;
  badge?: string;
}

interface CarouselDeckProps {
  cards: DeckCard[];
  autoplay?: boolean;
  colors?: DeckColors;
  fontSizes?: DeckFontSizes;
  /** Колбэк при смене активной карточки (для прогресса/аналитики). */
  onIndexChange?: (index: number) => void;
}

/** Адаптивный «зазор» стека (порт расчёта из шаблона, под нашу ширину окна). */
function calculateGap(width: number) {
  const minWidth = 380;
  const maxWidth = 720;
  const minGap = 36;
  const maxGap = 64;
  if (width <= minWidth) return minGap;
  if (width >= maxWidth) return maxGap;
  return minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth));
}

/**
 * CarouselDeck — 3D-стек карточек в формате присланного шаблона
 * CircularTestimonials: всегда видно три (left / center / right) с rotateY,
 * текст «проявляется» по словам с blur, стрелочная навигация + автоплей,
 * клавиши ←/→. Адаптировано под тёмную тему и liquid glass.
 */
export const CarouselDeck = ({
  cards,
  autoplay = false,
  colors = {},
  fontSizes = {},
  onIndexChange,
}: CarouselDeckProps) => {
  const colorBadge = colors.badge ?? "rgb(var(--accent))";
  const colorTitle = colors.title ?? "#EAF0FC";
  const colorBody = colors.body ?? "#9FB0CF";
  const colorMeta = colors.meta ?? "#647597";
  const colorArrowBg = colors.arrowBackground ?? "rgba(255,255,255,.05)";
  const colorArrowFg = colors.arrowForeground ?? "#EAF0FC";
  const colorArrowHoverBg = colors.arrowHoverBackground ?? "rgb(var(--accent))";
  const cardFace = colors.cardFace ?? "rgba(13,20,34,.66)";
  const cardBorder = colors.cardBorder ?? "rgba(255,255,255,.12)";

  const fsTitle = fontSizes.title ?? "1.15rem";
  const fsBody = fontSizes.body ?? "0.98rem";
  const fsBadge = fontSizes.badge ?? "0.7rem";

  const isMobile = useIsMobile();
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverPrev, setHoverPrev] = useState(false);
  const [hoverNext, setHoverNext] = useState(false);
  const [containerWidth, setContainerWidth] = useState(640);
  const stageRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const len = useMemo(() => cards.length, [cards]);
  const active = useMemo(() => cards[activeIndex], [activeIndex, cards]);

  useEffect(() => {
    function onResize() {
      if (stageRef.current) setContainerWidth(stageRef.current.offsetWidth);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    onIndexChange?.(activeIndex);
  }, [activeIndex, onIndexChange]);

  // автоплей
  useEffect(() => {
    if (autoplay && len > 1) {
      autoplayRef.current = setInterval(() => {
        setActiveIndex((p) => (p + 1) % len);
      }, 6000);
    }
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [autoplay, len]);

  const next = useCallback(() => {
    setActiveIndex((p) => (p + 1) % len);
    if (autoplayRef.current) clearInterval(autoplayRef.current);
  }, [len]);
  const prev = useCallback(() => {
    setActiveIndex((p) => (p - 1 + len) % len);
    if (autoplayRef.current) clearInterval(autoplayRef.current);
  }, [len]);

  // свайп влево/вправо для мобильного одно-карточного режима
  const onSwipeEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x < -60 || info.velocity.x < -500) next();
      else if (info.offset.x > 60 || info.velocity.x > 500) prev();
    },
    [next, prev]
  );

  // клавиатура ←/→
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  // трансформы стека (порт getImageStyle: left/center/right + скрытие прочих)
  function cardStyle(index: number): React.CSSProperties {
    const gap = calculateGap(containerWidth);
    const stick = gap * 0.55;
    const isActive = index === activeIndex;
    const isLeft = (activeIndex - 1 + len) % len === index;
    const isRight = (activeIndex + 1) % len === index;
    const base: React.CSSProperties = {
      transition: "all 0.7s cubic-bezier(.4,1.4,.4,1)",
    };
    if (isActive)
      return {
        ...base,
        zIndex: 3,
        opacity: 1,
        pointerEvents: "auto",
        transform: "translateX(0) translateY(0) scale(1) rotateY(0deg)",
      };
    if (isLeft)
      return {
        ...base,
        zIndex: 2,
        opacity: 0.55,
        pointerEvents: "auto",
        transform: `translateX(-${gap}px) translateY(${stick}px) scale(0.9) rotateY(14deg)`,
      };
    if (isRight)
      return {
        ...base,
        zIndex: 2,
        opacity: 0.55,
        pointerEvents: "auto",
        transform: `translateX(${gap}px) translateY(${stick}px) scale(0.9) rotateY(-14deg)`,
      };
    return { ...base, zIndex: 1, opacity: 0, pointerEvents: "none" };
  }

  // содержимое одной карточки (общее для мобайла и десктопа).
  // ВАЖНО: это обычная функция, которую мы ВЫЗЫВАЕМ ({cardInner(...)}), а не
  // рендерим как <Компонент/> — иначе React пересоздавал бы тип на каждый рендер
  // и ремаунтил карточку (мигание/повтор blur-анимации на мобилке).
  function cardInner(c: DeckCard, animateBody: boolean) {
    return (
      <>
        <span
          className="deck-badge"
          style={{
            color: c.accent ?? colorBadge,
            borderColor: (c.accent ?? "rgb(var(--accent))") + "55",
            fontSize: fsBadge,
          }}
        >
          {c.badge}
        </span>
        <h4 className="deck-title" style={{ color: colorTitle, fontSize: fsTitle }}>
          {c.title}
        </h4>
        {animateBody ? (
          <p className="deck-body" style={{ color: colorBody, fontSize: fsBody }}>
            {c.body.split(" ").map((word, i) => (
              <motion.span
                key={i}
                initial={{ filter: "blur(10px)", opacity: 0, y: 5 }}
                animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut", delay: 0.018 * i }}
                style={{ display: "inline-block" }}
              >
                {word}&nbsp;
              </motion.span>
            ))}
          </p>
        ) : (
          <p className="deck-body deck-body-static" style={{ color: colorBody, fontSize: fsBody }}>
            {c.body}
          </p>
        )}
        {c.meta && (
          <div className="deck-meta" style={{ color: colorMeta }}>
            {c.meta}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="deck">
      {isMobile ? (
        /* ——— МОБАЙЛ: одна карточка во всю ширину, листается свайпом ——— */
        <div className="deck-stage deck-stage-mobile" ref={stageRef}>
          <AnimatePresence mode="wait" initial={false}>
            {active && (
              <motion.article
                key={activeIndex}
                className="deck-card deck-card-mobile"
                style={{
                  // непрозрачная карточка — иначе тёмный фон делает текст тусклым
                  background:
                    "linear-gradient(180deg, rgb(var(--glass-hi) / 0.05), transparent 45%), rgb(var(--bg-2) / 0.97)",
                  borderColor: active.accent ? active.accent + "88" : cardBorder,
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={onSwipeEnd}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
              >
                {/* на мобилке body без пословного blur-reveal — он мутит текст;
                    карточка и так плавно въезжает целиком */}
                {cardInner(active, false)}
              </motion.article>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ——— ДЕСКТОП: 3D-стек карточек ——— */
        <div className="deck-stage" ref={stageRef}>
          {cards.map((c, index) => (
            <article
              key={index}
              className="deck-card"
              data-index={index}
              style={{
                ...cardStyle(index),
                background: cardFace,
                borderColor: c.accent ? c.accent + "66" : cardBorder,
              }}
              onClick={() => index !== activeIndex && setActiveIndex(index)}
            >
              {cardInner(c, index === activeIndex)}
            </article>
          ))}
        </div>
      )}

      {/* нижняя панель: точки + стрелки */}
      <div className="deck-controls">
        <div className="deck-dots">
          {cards.map((_, i) => (
            <button
              key={i}
              className={"deck-dot" + (i === activeIndex ? " on" : "")}
              onClick={() => setActiveIndex(i)}
              aria-label={`Карточка ${i + 1}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            className="deck-counter"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {active?.badge} · {activeIndex + 1}/{len}
          </motion.div>
        </AnimatePresence>

        <div className="deck-arrows">
          <button
            className="deck-arrow"
            onClick={prev}
            onMouseEnter={() => setHoverPrev(true)}
            onMouseLeave={() => setHoverPrev(false)}
            style={{ background: hoverPrev ? colorArrowHoverBg : colorArrowBg }}
            aria-label="Назад"
          >
            <ArrowLeft size={18} color={hoverPrev ? "#0a0e18" : colorArrowFg} />
          </button>
          <button
            className="deck-arrow"
            onClick={next}
            onMouseEnter={() => setHoverNext(true)}
            onMouseLeave={() => setHoverNext(false)}
            style={{ background: hoverNext ? colorArrowHoverBg : colorArrowBg }}
            aria-label="Вперёд"
          >
            <ArrowRight size={18} color={hoverNext ? "#0a0e18" : colorArrowFg} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .deck {
          width: 100%;
        }
        .deck-stage {
          position: relative;
          width: 100%;
          height: 16.5rem;
          perspective: 1100px;
        }
        /* мобайл: карточка в обычном потоке, без 3D-стека и боковых пиков */
        .deck-stage-mobile {
          height: auto;
          min-height: 15rem;
          perspective: none;
          display: flex;
        }
        .deck-card-mobile {
          position: relative;
          inset: auto;
          width: 100%;
          min-height: 15rem;
          cursor: grab;
          touch-action: pan-y;
          /* карточка непрозрачная — размытие тут только мутит текст */
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }
        .deck-card-mobile:active {
          cursor: grabbing;
        }
        .deck-card {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          padding: 22px;
          border-radius: 18px;
          border: 1px solid;
          backdrop-filter: blur(10px);
          box-shadow: 0 18px 50px -24px rgba(0, 0, 0, 0.8);
          cursor: pointer;
          will-change: transform, opacity;
        }
        .deck-badge {
          align-self: flex-start;
          font-family: var(--mono, ui-monospace, monospace);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid;
          margin-bottom: 12px;
        }
        .deck-title {
          margin: 0 0 10px;
          font-weight: 700;
          line-height: 1.25;
        }
        .deck-body {
          margin: 0;
          line-height: 1.6;
          overflow-y: auto;
        }
        .deck-body-static {
          opacity: 0.9;
        }
        .deck-meta {
          margin-top: auto;
          padding-top: 12px;
          font-family: var(--mono, ui-monospace, monospace);
          font-size: 11px;
          letter-spacing: 0.04em;
        }
        .deck-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 18px;
        }
        .deck-dots {
          display: flex;
          gap: 10px;
        }
        .deck-dot {
          position: relative;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          border: 0;
          padding: 0;
          background: rgba(132, 156, 200, 0.28);
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }
        /* невидимая увеличенная зона тапа (точки 7px слишком мелкие для пальца) */
        .deck-dot::before {
          content: "";
          position: absolute;
          inset: -11px;
          border-radius: 50%;
        }
        .deck-dot.on {
          background: rgb(var(--accent));
          transform: scale(1.25);
        }
        .deck-counter {
          font-family: var(--mono, ui-monospace, monospace);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #647597;
        }
        .deck-arrows {
          display: flex;
          gap: 10px;
        }
        .deck-arrow {
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.12);
          transition: background-color 0.3s;
        }
      `}</style>
    </div>
  );
};

export default CarouselDeck;
