"use client";

import * as React from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";

/**
 * Лёгкий bottom-sheet: выезжает снизу, grabber-рукоятка, свайп вниз закрывает,
 * клик по бэкдропу закрывает. Используется для мобильных шитов (Прогресс, Урок).
 */
export function BottomSheet({
  open,
  onClose,
  children,
  maxHeight = "82dvh",
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
  label?: string;
}) {
  const dragControls = useDragControls();

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-[58] flex items-end justify-center"
          style={{
            background: "rgb(var(--scrim) / 0.42)",
            // только мягкий расфокус (без brightness — иначе почти чёрный экран)
            backdropFilter: "blur(12px) saturate(120%)",
            WebkitBackdropFilter: "blur(12px) saturate(120%)",
          }}
        >
          <motion.div
            className="w-full overflow-hidden rounded-t-2xl border border-b-0 border-[rgb(var(--glass-hi)/var(--glass-border-a))]"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            style={{
              maxHeight,
              position: "relative",
              zIndex: 1,
              // СПЛОШНОЙ фон БЕЗ backdrop-filter — чёткий шит поверх размытого скрима
              background:
                "linear-gradient(180deg, rgb(var(--glass-hi) / 0.06), transparent 40%), rgb(var(--bg-1))",
              boxShadow: "0 -12px 40px -16px rgba(0,0,0,0.6)",
            }}
          >
            {/* тянуть/закрывать можно только за рукоятку — иначе свайп ломал бы скролл контента */}
            <div
              className="pt-2"
              style={{ touchAction: "none", cursor: "grab" }}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div
                aria-hidden="true"
                className="mx-auto h-1 w-10 rounded-full"
                style={{ background: "rgb(var(--glass-hi) / 0.35)" }}
              />
            </div>
            <div
              className="thin-scroll overflow-y-auto p-4 pb-[max(18px,env(safe-area-inset-bottom))]"
              style={{ maxHeight: `calc(${maxHeight} - 20px)`, overscrollBehavior: "contain" }}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
