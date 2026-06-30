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
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[rgb(var(--accent))] text-[rgb(var(--bg-0))] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)] sm:bottom-6 sm:right-6"
      style={{
        // безопасная зона для устройств с домашней полосой (iPhone)
        bottom: "max(1.25rem, env(safe-area-inset-bottom))",
      }}
    >
      <Sparkles className="h-6 w-6" />
      <span className="sr-only">Открыть ИИ-репетитора</span>
    </motion.a>
  );
}
