"use client";

/**
 * Синхронизация Zustand-store с бэкендом.
 *
 * Store устроен вложенно:
 *   state.game    (GameState — xp, streak, dailyXp…)
 *   state.profile (Profile   — name, avatarEmoji, targetScore…)
 *   state.data    (Record<subject, Subject>) → floors[i].{prog, stab}
 *
 * Мутации иммутабельны (bump, calibrate, gainXp, updateProfile создают
 * новые объекты) — subscribe надёжно ловит изменения по ссылке.
 *
 * Применение серверных данных:
 *   - profile через экшен updateProfile(patch) (сохраняет и в localStorage)
 *   - game через прямой setState (merge поверх текущего)
 *   - progress через экшен calibrate(id, prog, stab) на каждый этаж
 *
 * Флаг isApplyingFromServer защищает от эха «серверное значение → push».
 */

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useApp } from "@/lib/store";
import { createDebouncedPush } from "./pushQueue";

// ─── Ключи, которые синхронизируем ───────────────────────────────

const GAME_KEYS = ["xp", "dailyXp", "dailyGoal", "streak", "lastActiveDay", "combo", "bestCombo"] as const;

const PROFILE_KEYS = [
  "name",
  "avatarEmoji",
  "avatarHue",
  "targetScore",
  "examDate",
  "viewMode",
  "viewChosen",
  "sound",
  "notify",
] as const;

// ─── Push-очереди ─────────────────────────────────────────────

const pushGame = createDebouncedPush<Record<string, unknown>>({
  url: "/api/user/game",
  method: "PATCH",
});

const pushProfile = createDebouncedPush<Record<string, unknown>>({
  url: "/api/user/profile",
  method: "PATCH",
});

const pushProgress = createDebouncedPush<Array<{ topicId: string; prog: number; stab: number }>>({
  url: "/api/user/progress",
  method: "POST",
});

let isApplyingFromServer = false;

// ─── Хук ──────────────────────────────────────────────────────

export function useProfileSync() {
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const loadedForUserRef = useRef<string | null>(null);

  // 1. Загрузка с сервера при появлении сессии
  useEffect(() => {
    if (status !== "authenticated" || !userId) return;
    if (loadedForUserRef.current === userId) return;
    loadedForUserRef.current = userId;

    (async () => {
      isApplyingFromServer = true;
      try {
        const [profileR, gameR, progressR] = await Promise.all([
          fetch("/api/user/profile", { credentials: "same-origin" }).then(safeJson),
          fetch("/api/user/game", { credentials: "same-origin" }).then(safeJson),
          fetch("/api/user/progress", { credentials: "same-origin" }).then(safeJson),
        ]);
        applyProfile(profileR);
        applyGame(gameR);
        applyProgress(progressR);
      } catch (err) {
        console.warn("[sync] initial load failed:", err);
      } finally {
        setTimeout(() => {
          isApplyingFromServer = false;
        }, 250);
      }
    })();
  }, [userId, status]);

  // 2. Слежение за изменениями store → отправка на сервер
  useEffect(() => {
    if (status !== "authenticated") return;

    const initial = useApp.getState();
    let prevGame = pickKeys(getSlice(initial, "game"), GAME_KEYS);
    let prevProfile = pickKeys(getSlice(initial, "profile"), PROFILE_KEYS);
    let prevProgress = extractProgress(initial);

    const unsubscribe = useApp.subscribe((state) => {
      // Не пушим, пока идёт первичная заливка с сервера
      if (isApplyingFromServer) {
        prevGame = pickKeys(getSlice(state, "game"), GAME_KEYS);
        prevProfile = pickKeys(getSlice(state, "profile"), PROFILE_KEYS);
        prevProgress = extractProgress(state);
        return;
      }

      const currGame = pickKeys(getSlice(state, "game"), GAME_KEYS);
      if (!shallowEqual(currGame, prevGame)) {
        prevGame = currGame;
        pushGame(currGame);
      }

      const currProfile = pickKeys(getSlice(state, "profile"), PROFILE_KEYS);
      if (!shallowEqual(currProfile, prevProfile)) {
        prevProfile = currProfile;
        pushProfile(currProfile);
      }

      const currProgress = extractProgress(state);
      const changed = diffProgress(prevProgress, currProgress);
      if (changed.length > 0) {
        prevProgress = currProgress;
        pushProgress(changed);
      }
    });

    return unsubscribe;
  }, [status]);

  // 3. При выходе — сбрасываем маркер (чтобы новый юзер загрузил свои данные)
  useEffect(() => {
    if (status === "unauthenticated" && loadedForUserRef.current) {
      loadedForUserRef.current = null;
    }
  }, [status]);
}

// ─── Помощники ───────────────────────────────────────────────

async function safeJson(res: Response): Promise<unknown> {
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Достаёт значение по ключу из произвольного объекта. */
function getSlice(state: unknown, key: string): unknown {
  if (state && typeof state === "object") return (state as Record<string, unknown>)[key];
  return null;
}

/** Плоский срез: только указанные ключи из объекта. */
function pickKeys(obj: unknown, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (obj && typeof obj === "object") {
    const src = obj as Record<string, unknown>;
    for (const k of keys) {
      if (k in src && src[k] !== undefined) out[k] = src[k];
    }
  }
  return out;
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => a[k] === b[k]);
}

/** Собираем map {floorId → {prog, stab}} со всех предметов. */
function extractProgress(state: unknown): Record<string, { prog: number; stab: number }> {
  const out: Record<string, { prog: number; stab: number }> = {};
  try {
    const s = state as {
      data?: Record<string, { floors?: Array<{ id?: string; prog?: number; stab?: number }> }>;
    };
    if (s.data) {
      for (const subjectKey in s.data) {
        const subj = s.data[subjectKey];
        if (subj?.floors) {
          for (const f of subj.floors) {
            if (f?.id) out[f.id] = { prog: Number(f.prog ?? 0), stab: Number(f.stab ?? 0) };
          }
        }
      }
    }
  } catch {
    /* store устроен иначе — молча пропускаем */
  }
  return out;
}

function diffProgress(
  prev: Record<string, { prog: number; stab: number }>,
  curr: Record<string, { prog: number; stab: number }>
): Array<{ topicId: string; prog: number; stab: number }> {
  const changed: Array<{ topicId: string; prog: number; stab: number }> = [];
  for (const id in curr) {
    const p = prev[id];
    const c = curr[id];
    if (!p || p.prog !== c.prog || p.stab !== c.stab) {
      changed.push({ topicId: id, prog: c.prog, stab: c.stab });
    }
  }
  return changed;
}

// ─── Применение серверных данных ─────────────────────────────

function applyProfile(profile: unknown) {
  const patch = pickKeys(profile, PROFILE_KEYS);
  if (Object.keys(patch).length === 0) return;
  try {
    const st = useApp.getState() as { updateProfile?: (patch: unknown) => void };
    if (typeof st.updateProfile === "function") {
      st.updateProfile(patch);
      return;
    }
  } catch {
    /* fallback ниже */
  }
  useApp.setState((s: unknown) => {
    const st = s as { profile?: Record<string, unknown> };
    return { profile: { ...(st.profile ?? {}), ...patch } } as never;
  });
}

function applyGame(game: unknown) {
  const patch = pickKeys(game, GAME_KEYS);
  if (Object.keys(patch).length === 0) return;
  useApp.setState((s: unknown) => {
    const st = s as { game?: Record<string, unknown> };
    return { game: { ...(st.game ?? {}), ...patch } } as never;
  });
}

function applyProgress(rows: unknown) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  try {
    const st = useApp.getState() as {
      calibrate?: (id: string, prog: number, stab: number) => void;
    };
    if (typeof st.calibrate !== "function") return;
    for (const r of rows as Array<{ topicId?: string; prog?: number; stab?: number }>) {
      if (r?.topicId) {
        st.calibrate(r.topicId, Number(r.prog ?? 0), Number(r.stab ?? 0));
      }
    }
  } catch (err) {
    console.warn("[sync] applyProgress failed:", err);
  }
}
