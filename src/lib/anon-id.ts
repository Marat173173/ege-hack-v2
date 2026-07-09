"use client";

/**
 * Анонимный идентификатор пользователя (до появления полноценных аккаунтов).
 * Живёт в localStorage, дублируется в cookie — чтобы сервер (API-роуты)
 * мог прочитать его без тела запроса.
 */

const KEY = "egehack.anon.v1";
const COOKIE = "anon_id";
/** ЗАГЛУШКА единого аккаунта: localStorage недоступен (приватный режим и т.п.). */
const STUB = "anon-stub";
const MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 года

export function getAnonId(): string {
  if (typeof window === "undefined") return "";
  let id: string;
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      id = stored;
    } else {
      id = genUuid();
      localStorage.setItem(KEY, id);
    }
  } catch {
    return STUB;
  }
  try {
    document.cookie = `${COOKIE}=${id}; path=/; max-age=${MAX_AGE}; samesite=lax`;
  } catch {
    /* ignore */
  }
  return id;
}

function genUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // фолбэк для старых WebView без crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
