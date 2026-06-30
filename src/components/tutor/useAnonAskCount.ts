"use client";

import * as React from "react";

const LIMIT = 3;
const KEY = "ege-hack:tutor:asked-count";

/**
 * Хук-счётчик заданных анонимом вопросов.
 *
 * Хранит число в localStorage. Не претендует на серьёзную защиту от обхода
 * (продвинутый пользователь обнулит ключ или откроет приватное окно) — это
 * мягкий nudge к регистрации, а не security control. Серверный rate limit
 * добавится позже.
 */
export function useAnonAskCount() {
  const [count, setCount] = React.useState(0);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? Math.max(0, Math.min(99, parseInt(raw, 10) || 0)) : 0;
    setCount(parsed);
    setHydrated(true);
  }, []);

  const increment = React.useCallback(() => {
    setCount((c) => {
      const next = c + 1;
      try {
        window.localStorage.setItem(KEY, String(next));
      } catch {
        /* приватный режим / quota — игнорируем */
      }
      return next;
    });
  }, []);

  const reset = React.useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setCount(0);
  }, []);

  return {
    count,
    remaining: Math.max(0, LIMIT - count),
    blocked: hydrated && count >= LIMIT,
    limit: LIMIT,
    hydrated,
    increment,
    reset,
  };
}
