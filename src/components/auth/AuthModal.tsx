"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { Loader2, Mail, Lock, User as UserIcon, Sparkles, X } from "lucide-react";

/**
 * Модалка входа и регистрации.
 * Два режима переключаются по табам — форма и логика общие.
 *
 * После успешного входа/регистрации:
 *   1. Забираем anonId из localStorage (ключ egehack.anon.v1)
 *   2. POST /api/auth/link-anon — переносим тренировки на новый аккаунт
 *   3. onClose() — возврат в приложение
 *
 * Использует свой Modal через фиксированный overlay + framer-motion
 * (не тащит зависимость от @/components/ui/modal, чтобы файл был
 * самодостаточным).
 */

type Mode = "signin" | "signup";
type Props = { open: boolean; onClose: () => void; defaultMode?: Mode };

export function AuthModal({ open, onClose, defaultMode = "signin" }: Props) {
  const [mode, setMode] = React.useState<Mode>(defaultMode);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setError(null);
    }
  }, [open, defaultMode]);

  async function linkAnonId() {
    try {
      const anonId = window.localStorage.getItem("egehack.anon.v1");
      if (!anonId) return;
      await fetch("/api/auth/link-anon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId }),
      });
    } catch {
      // Не критично — данные не потеряны, просто ещё не привязаны.
      // Можно повторить при следующем входе.
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const em = email.trim().toLowerCase();
    if (!em || !em.includes("@")) return setError("Введи корректный email");
    if (password.length < 6) return setError("Пароль минимум 6 символов");

    setBusy(true);
    setError(null);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: em, password, name: name.trim() || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Не удалось создать аккаунт");
          setBusy(false);
          return;
        }
      }

      // Оба режима заканчиваются вызовом signIn — Credentials-провайдер
      // проверит пароль и создаст сессию.
      const signRes = await signIn("credentials", {
        email: em,
        password,
        redirect: false,
      });

      if (!signRes || signRes.error) {
        setError("Неверный email или пароль");
        setBusy(false);
        return;
      }

      await linkAnonId();
      setBusy(false);

      // Мягкое обновление, чтобы SessionProvider подхватил сессию везде
      onClose();
      window.location.reload();
    } catch {
      setError("Ошибка соединения. Попробуй ещё раз.");
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.form
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="relative w-full max-w-sm rounded-3xl border p-6 sm:p-8"
            style={{
              background: "rgb(var(--bg-1))",
              borderColor: "rgb(var(--line))",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgb(var(--glass-hi) / 0.05)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-mid transition-colors hover:bg-white/5 hover:text-hi"
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>

            <div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-accent/15">
              <Sparkles size={20} className="text-accent" />
            </div>

            <h2 className="mb-1 font-serif text-2xl text-hi">
              {mode === "signin" ? "С возвращением" : "Создать аккаунт"}
            </h2>
            <p className="mb-6 text-[13px] leading-snug text-mid">
              {mode === "signin"
                ? "Войди, чтобы вернуться к прогрессу и истории репетитора."
                : "Твой прогресс, история чата и XP будут сохранены."}
            </p>

            {/* Табы режима */}
            <div className="mb-5 grid grid-cols-2 rounded-xl border border-line p-1 text-[12px]">
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className="rounded-lg py-2 font-medium transition-colors"
                  style={{
                    background: mode === m ? "rgb(var(--accent))" : "transparent",
                    color: mode === m ? "rgb(var(--bg-0))" : "rgb(var(--mid))",
                  }}
                >
                  {m === "signin" ? "Войти" : "Регистрация"}
                </button>
              ))}
            </div>

            {/* Имя — только при регистрации */}
            {mode === "signup" && (
              <label className="mb-3 block">
                <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-lo">
                  <UserIcon size={11} /> Имя (необязательно)
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  placeholder="Как к тебе обращаться"
                  autoComplete="name"
                  className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-[14px] text-hi outline-none placeholder:text-lo focus:border-accent/60"
                />
              </label>
            )}

            <label className="mb-3 block">
              <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-lo">
                <Mail size={11} /> Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-[14px] text-hi outline-none placeholder:text-lo focus:border-accent/60"
              />
            </label>

            <label className="mb-4 block">
              <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-lo">
                <Lock size={11} /> Пароль
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder={mode === "signup" ? "Минимум 6 символов" : ""}
                className="w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-[14px] text-hi outline-none placeholder:text-lo focus:border-accent/60"
              />
            </label>

            {error && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-[14px] font-semibold text-bg-0 transition-transform hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {mode === "signin" ? "Войти" : "Создать аккаунт"}
            </button>

            <p className="mt-4 text-center text-[11.5px] leading-snug text-lo">
              {mode === "signin" ? (
                <>
                  Нет аккаунта?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-accent underline-offset-2 hover:underline">
                    Зарегистрируйся
                  </button>
                </>
              ) : (
                <>
                  Уже есть аккаунт?{" "}
                  <button type="button" onClick={() => setMode("signin")} className="text-accent underline-offset-2 hover:underline">
                    Войти
                  </button>
                </>
              )}
            </p>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
