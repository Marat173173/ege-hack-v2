"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, User } from "lucide-react";
import { AuthModal } from "./AuthModal";

/**
 * Универсальная кнопка авторизации.
 *
 * Гость → «Войти» (открывает AuthModal).
 * Авторизован → аватар с инициалом. Клик открывает меню с email
 * и кнопкой «Выйти».
 *
 * Разместить в шапке приложения или в углу экрана. Стиль минималистичный —
 * подстраивается под окружение.
 */
export function AuthButton() {
  const { data: session, status } = useSession();
  const [authOpen, setAuthOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);

  // Закрытие меню при клике вне
  React.useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!btnRef.current) return;
      if (!btnRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  // Пока сессия грузится — тихая заглушка (не мигаем «Войти»)
  if (status === "loading") {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-white/5" />;
  }

  const user = session?.user;
  const initial = (user?.name?.[0] || user?.email?.[0] || "?").toUpperCase();

  if (!user) {
    return (
      <>
        <button
          onClick={() => setAuthOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3.5 py-2 text-[12.5px] font-medium text-hi transition-colors hover:bg-white/10"
        >
          <LogIn size={13} />
          <span>Войти</span>
        </button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setMenuOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-full border border-line bg-accent/20 text-[13px] font-bold text-accent transition-colors hover:bg-accent/30"
        aria-label="Меню аккаунта"
      >
        {initial}
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-11 z-50 min-w-[220px] rounded-2xl border border-line bg-[rgb(var(--bg-1))] p-2 shadow-2xl"
          >
            <div className="mb-1 border-b border-line px-3 py-2">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-lo">
                <User size={10} /> Аккаунт
              </div>
              <div className="mt-1 truncate text-[12.5px] font-medium text-hi">
                {user.name || "Ученик"}
              </div>
              <div className="truncate text-[11px] text-mid">{user.email}</div>
            </div>

            <button
              onClick={() => {
                setMenuOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-mid transition-colors hover:bg-white/5 hover:text-hi"
            >
              <LogOut size={13} />
              Выйти
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
