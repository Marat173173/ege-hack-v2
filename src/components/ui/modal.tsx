"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useDragControls, useMotionValue, type PanInfo } from "framer-motion";
import { X, GripHorizontal } from "lucide-react";
import { useIsMobile } from "@/lib/use-media";

interface ModalColors {
  scrim?: string;
  border?: string;
  closeFg?: string;
  closeHoverBg?: string;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
  title?: React.ReactNode;
  maxWidth?: string;
  colors?: ModalColors;
  /** Закрывать по клику на бэкдроп. По умолчанию true. */
  dismissable?: boolean;
  /** Разрешить перетаскивание за шапку (десктоп). По умолчанию true. */
  draggable?: boolean;
}

/**
 * Адаптивная модалка:
 *  - МОБАЙЛ: bottom-sheet — выезжает снизу, drag-handle (grabber) сверху,
 *    свайп вниз закрывает (как в Telegram/Instagram/iOS);
 *  - ДЕСКТОП: центрированная карточка, перетаскивается за шапку;
 *  - liquid glass, focus-trap, Esc, блокировка скролла, возврат фокуса, safe-area.
 */
export const Modal = ({
  open,
  onClose,
  children,
  label,
  title,
  maxWidth = "44rem",
  colors = {},
  dismissable = true,
  draggable = true,
}: ModalProps) => {
  const isMobile = useIsMobile();
  const scrim = colors.scrim ?? "rgb(var(--scrim) / 0.58)";
  const border = colors.border ?? "rgb(var(--glass-hi) / var(--glass-border-a))";
  const closeFg = colors.closeFg ?? "rgb(var(--mid))";
  const closeHoverBg = colors.closeHoverBg ?? "rgb(var(--glass-hi) / 0.1)";

  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const dragControls = useDragControls();
  // смещение перетаскивания десктоп-карточки (сбрасывается при открытии)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    if (!open) return;
    x.set(0);
    y.set(0);
    lastFocused.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
      lastFocused.current?.focus?.();
    };
  }, [open, x, y]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  // свайп вниз закрывает bottom-sheet
  const onSheetDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  const ariaLabel = typeof title === "string" ? title : label;

  // —— общие части шапки/тела ——
  const Header = (
    <div
      onPointerDown={(e) => !isMobile && draggable && dragControls.start(e)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        padding: isMobile ? "8px 18px 12px" : "16px 20px 12px",
        cursor: !isMobile && draggable ? "grab" : "default",
        touchAction: "none",
      }}
    >
      <div style={{ minWidth: 0 }}>
        {!isMobile && draggable && (
          <GripHorizontal
            size={16}
            aria-hidden="true"
            style={{ color: "rgb(var(--lo))", opacity: 0.55, marginBottom: 6 }}
          />
        )}
        {label && (
          <span
            style={{
              display: "block",
              fontFamily: "var(--mono, ui-monospace, monospace)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgb(var(--lo))",
            }}
          >
            {label}
          </span>
        )}
        {title && (
          <h2
            style={{
              margin: "6px 0 0",
              fontFamily: "var(--serif, ui-serif, Georgia, serif)",
              fontSize: isMobile ? "1.25rem" : "1.4rem",
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: "rgb(var(--hi))",
            }}
          >
            {title}
          </h2>
        )}
      </div>
      <button
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Закрыть"
        className="modal-close-btn"
        style={{
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          width: isMobile ? 44 : 38,
          height: isMobile ? 44 : 38,
          borderRadius: 12,
          border: "1px solid rgb(var(--line) / var(--line-2a))",
          background: "transparent",
          cursor: "pointer",
          color: closeFg,
          transition: "background-color 0.2s, color 0.2s",
        }}
      >
        <X size={18} />
      </button>
    </div>
  );

  const Body = (
    <div
      className="thin-scroll"
      style={{
        padding: isMobile ? "0 18px max(20px, env(safe-area-inset-bottom))" : "0 20px 20px",
        overflowY: "auto",
        overscrollBehavior: "contain",
      }}
    >
      {children}
    </div>
  );

  const glassShadow =
    "inset 0 1px 0 0 rgb(var(--glass-hi) / var(--glass-hi-a)), inset 0 0 26px -8px rgb(var(--glass-hi) / 0.14), 0 40px 90px -40px rgba(0,0,0,0.7)";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={backdropRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onPointerDown={(e) => {
            if (dismissable && e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: isMobile ? "flex-end" : "center",
            justifyContent: "center",
            padding: isMobile ? 0 : 16,
            background: scrim,
            // только мягкий расфокус фона — БЕЗ brightness: сцена и так тёмная,
            // затемнение делало экран почти чёрным
            backdropFilter: "blur(12px) saturate(120%)",
            WebkitBackdropFilter: "blur(12px) saturate(120%)",
          }}
        >
          {isMobile ? (
            /* ——— МОБАЙЛ: bottom-sheet ——— */
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={onSheetDragEnd}
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                maxHeight: "92dvh",
                display: "flex",
                flexDirection: "column",
                borderRadius: "22px 22px 0 0",
                border: `1px solid ${border}`,
                borderBottom: "none",
                overflow: "hidden",
                // СПЛОШНОЙ непрозрачный фон БЕЗ backdrop-filter — панель стоит
                // чёткой ПОВЕРХ размытого скрима, а не «за стеклом»
                background:
                  "linear-gradient(180deg, rgb(var(--glass-hi) / 0.06), transparent 40%), rgb(var(--bg-1))",
                boxShadow: glassShadow,
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              onKeyDown={onKeyDown}
            >
              {/* grabber-рукоятка + зона свайпа */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                style={{ touchAction: "none", paddingTop: 8, cursor: "grab" }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 99,
                    background: "rgb(var(--glass-hi) / 0.35)",
                    margin: "0 auto",
                  }}
                />
              </div>
              {Header}
              {Body}
            </motion.div>
          ) : (
            /* ——— ДЕСКТОП: центрированная перетаскиваемая карточка ——— */
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              drag={draggable}
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              dragElastic={0.04}
              dragConstraints={backdropRef}
              style={{
                x,
                y,
                position: "relative",
                zIndex: 1,
                width: "100%",
                maxWidth,
                maxHeight: "min(88vh, 760px)",
                display: "flex",
                flexDirection: "column",
                borderRadius: 24,
                border: `1px solid ${border}`,
                overflow: "hidden",
                // СПЛОШНОЙ непрозрачный фон БЕЗ backdrop-filter — чёткая карточка
                // поверх размытого скрима (не «за стеклом»)
                background:
                  "linear-gradient(180deg, rgb(var(--glass-hi) / 0.06), transparent 40%), rgb(var(--bg-1))",
                boxShadow: glassShadow,
              }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              onKeyDown={onKeyDown}
            >
              {Header}
              {Body}
            </motion.div>
          )}

          <style jsx>{`
            .modal-close-btn:hover {
              background: ${closeHoverBg} !important;
              color: rgb(var(--hi)) !important;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
