"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * Плавающая кнопка-FAB в правом нижнем углу для перехода на /tutor.
 * Скрывается на самой странице чата и в onboarding/landing, чтобы не мешать.
 */
export function TutorFAB() {
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    function check() {
      const p = window.location.pathname;
      // Не показывать на самой странице чата
      setHidden(p.startsWith("/tutor"));
    }
    check();
    window.addEventListener("popstate", check);
    return () => window.removeEventListener("popstate", check);
  }, []);

  if (hidden) return null;

  return (
    <motion.a
      href="/tutor"
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Открыть ИИ-репетитора"
      // по фидбеку: мельче и прозрачнее — не перетягивает внимание с контента
      className="fab-safe focus-ring fixed right-4 z-40 grid h-11 w-11 place-items-center rounded-full border sm:right-5"
      style={{
        background: "rgb(var(--accent) / 0.16)",
        borderColor: "rgb(var(--accent) / 0.35)",
        color: "rgb(var(--accent))",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        boxShadow: "0 8px 20px -12px rgba(0,0,0,0.5)",
      }}
    >
      <Sparkles className="h-5 w-5" />
      <span className="sr-only">Открыть ИИ-репетитора</span>
    </motion.a>
  );
}
