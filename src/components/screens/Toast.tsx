"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface ToastState {
  msg: string;
  nonce: number;
}

const ToastCtx = React.createContext<(msg: string) => void>(() => {});
export const useToast = () => React.useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ToastState | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  const show = React.useCallback((msg: string) => {
    setState({ msg, nonce: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState(null), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            key={state.nonce}
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="liquid-glass pointer-events-none fixed bottom-20 left-1/2 z-[40] flex max-w-[88vw] -translate-x-1/2 items-center gap-2.5 rounded-xl px-4 py-2.5"
          >
            <Sparkles size={15} className="shrink-0 text-accent" />
            <span
              className="text-[12.5px] text-hi [&_b]:text-accent"
              dangerouslySetInnerHTML={{ __html: state.msg }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </ToastCtx.Provider>
  );
}
