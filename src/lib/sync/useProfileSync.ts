"use client";

/**
 * Синхронизация Zustand-store с бэкендом.
 *
 * Что делает:
 *  1. При появлении сессии (user залогинен) — тянет свежие данные
 *     GET /api/user/{profile,game,progress} → вливает в store.
 *  2. Слушает изменения store: XP/streak/combo, поля профиля и
 *     прогресс этажей текущего предмета. Изменения отправляет с
 *     задержкой 2 сек (createDebouncedPush).
 *  3. При выходе из аккаунта — просто перестаёт что-либо делать.
 *     Локальные данные не трогает.
 *
 * Устойчиво к отсутствующим полям: если store коллеги переименовал
 * поле — просто пропустим его в push/apply без ошибки.
 *
 * Не пишем во время «первичной заливки» (флаг isApplyingFromServer),
 * чтобы не отправить обратно то, что только что получили.
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

// ─── Push-очереди (модульные, живут между рендерами) ────────────

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

// ─── Guard: не пушим обратно то, что только что получили ───────

let isApplyingFromServer = false;

// ─── Основной хук ───────────────────────────────────────────────

export function useProfileSync() {
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const loadedForUserRef = useRef<string | null>(null);

  // 1. При появлении сессии — загружаем данные с сервера
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
        // Небольшая задержка, чтобы React-обновления store успели
        // «просочиться» через subscribe до снятия guard
        setTimeout(() => {
          isApplyingFromServer = false;
        }, 250);
      }
    })();
  }, [userId, status]);

  // 2. Автосейв изменений в БД (debounced)
  useEffect(() => {
    if (status !== "authenticated") return;

    let prevGame = pickKeys(useApp.getState(), GAME_KEYS);
    let prevProfile = pickKeys(useApp.getState(), PROFILE_KEYS);
    let prevProgress = extractProgress(useApp.getState());

    const unsubscribe = useApp.subscribe((state) => {
      if (isApplyingFromServer) {
        // обновим срезы, чтобы не отправить их как «изменения»
        prevGame = pickKeys(state, GAME_KEYS);
        prevProfile = pickKeys(state, PROFILE_KEYS);
        prevProgress = extractProgress(state);
        return;
      }

      // Game
      const currGame = pickKeys(state, GAME_KEYS);
      if (!shallowEqual(currGame, prevGame)) {
        prevGame = currGame;
        pushGame(currGame);
      }

      // Profile
      const currProfile = pickKeys(state, PROFILE_KEYS);
      if (!shallowEqual(currProfile, prevProfile)) {
        prevProfile = currProfile;
        pushProfile(currProfile);
      }

      // Progress по этажам
      const currProgress = extractProgress(state);
      const changed = diffProgress(prevProgress, currProgress);
      if (changed.length > 0) {
        prevProgress = currProgress;
        pushProgress(changed);
      }
    });

    return unsubscribe;
  }, [status]);

  // 3. При выходе — сбрасываем маркер, чтобы при следующем входе
  //    (возможно, другим юзером) заново загрузились его данные.
  useEffect(() => {
    if (status === "unauthenticated" && loadedForUserRef.current) {
      loadedForUserRef.current = null;
    }
  }, [status]);
}

// ─── Помощники ──────────────────────────────────────────────────

async function safeJson(res: Response): Promise<unknown> {
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Достаёт указанные ключи из произвольного объекта.
 * Принимает `unknown` — работает с любым store, даже если у него нет
 * index signature. Внутри аккуратно приводим к Record через проверку.
 */
function pickKeys(obj: unknown, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (obj && typeof obj === "object") {
    const source = obj as Record<string, unknown>;
    for (const k of keys) {
      if (k in source && source[k] !== undefined) out[k] = source[k];
    }
  }
  return out;
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}

/** Достаёт map {floorId → {prog, stab}} из текущего subject. */
function extractProgress(state: unknown): Record<string, { prog: number; stab: number }> {
  const out: Record<string, { prog: number; stab: number }> = {};
  try {
    const s = state as { subject?: () => { floors?: Array<{ id?: string; prog?: number; stab?: number }> } };
    const subj = typeof s.subject === "function" ? s.subject() : null;
    const floors = subj?.floors;
    if (Array.isArray(floors)) {
      for (const f of floors) {
        if (f?.id) out[f.id] = { prog: Number(f.prog ?? 0), stab: Number(f.stab ?? 0) };
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

// ─── Применение полученных данных ───────────────────────────────

function applyProfile(profile: unknown) {
  const patch = pickKeys(profile, PROFILE_KEYS);
  if (Object.keys(patch).length === 0) return;
  useApp.setState((s) => ({ ...s, ...patch }));
}

function applyGame(game: unknown) {
  const patch = pickKeys(game, GAME_KEYS);
  if (Object.keys(patch).length === 0) return;
  useApp.setState((s) => ({ ...s, ...patch }));
}

function applyProgress(rows: unknown) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  try {
    const byId = new Map<string, { prog: number; stab: number }>();
    for (const r of rows as Array<{ topicId?: string; prog?: number; stab?: number }>) {
      if (r?.topicId) byId.set(r.topicId, { prog: Number(r.prog ?? 0), stab: Number(r.stab ?? 0) });
    }

    // Обновляем прогресс на текущем предмете, сохраняя порядок этажей
    useApp.setState((state) => {
      const s = state as {
        subject?: () => { floors?: Array<{ id?: string; prog?: number; stab?: number }> };
      };
      const subject = typeof s.subject === "function" ? s.subject() : null;
      if (!subject?.floors) return state;
      // мутируем внутри массива — Zustand увидит новый ref через spread top-level
      for (const f of subject.floors) {
        if (f?.id && byId.has(f.id)) {
          const row = byId.get(f.id)!;
          f.prog = row.prog;
          f.stab = row.stab;
        }
      }
      return { ...state };
    });
  } catch (err) {
    console.warn("[sync] applyProgress failed:", err);
  }
}
