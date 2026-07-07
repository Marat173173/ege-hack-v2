"use client";

import { create } from "zustand";
import { SUBJECTS, LIVE_KEYS, type Subject } from "@/data/catalog";
import { floorState } from "@/lib/floor-state";
import { DEFAULT_GAME, award, rolloverDay, clampDailyGoal, type GameState } from "@/lib/gamification";
import { DEFAULT_PROFILE, type Profile } from "@/lib/profile";

type Mode = "student" | "parent";
export type Theme = "light" | "dark";
export type Screen =
  | "landing"
  | "onboarding"
  | "format"
  | "spire"
  | "solve"
  | "parent"
  | "profile"
  | "chat"
  | "leagues";

/** Событие-празднование, которое показывает CelebrationOverlay. */
export type Celebration =
  | { kind: "floor-solid"; title: string; subtitle: string }
  | { kind: "level-up"; title: string; subtitle: string }
  | { kind: "goal"; title: string; subtitle: string }
  | { kind: "streak"; title: string; subtitle: string };

/** «Тост» прилёта XP (для всплывашек +N). */
export interface XpPing {
  id: number;
  amount: number;
}

interface AppState {
  subjectKey: string;
  mode: Mode;
  theme: Theme;
  screen: Screen;
  selectedId: string | null;
  focusId: string | null;
  lightMode: boolean;
  critOpen: boolean;
  solveFloorId: string | null;
  modal: { kind: "lesson" | "critique"; floorId: string } | null;
  /** Мобильные шиты: «Прогресс» (консоль) и «Выбор урока». */
  sheet: null | "progress" | "lessonPicker";
  data: Record<string, Subject>;

  // ——— профиль / персонализация ———
  profile: Profile;

  // ——— геймификация ———
  game: GameState;
  /** Очередь празднований; показывается celebrationQueue[0]. */
  celebrationQueue: Celebration[];
  xpPing: XpPing | null;

  subject: () => Subject;
  floorById: (id: string | null) => Subject["floors"][number] | undefined;

  setScreen: (s: Screen) => void;
  setSubject: (k: string) => void;
  setMode: (m: Mode) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  toggleLight: () => void;
  selectFloor: (id: string | null, opts?: { zoom?: boolean }) => void;
  closeInspector: () => void;
  setCritOpen: (v: boolean) => void;
  openSolve: (id: string) => void;
  openModal: (kind: "lesson" | "critique", floorId: string) => void;
  closeModal: () => void;
  setSheet: (s: null | "progress" | "lessonPicker") => void;
  bump: (id: string, dProg: number, dStab: number) => void;

  // гейм-экшены
  ensureDay: () => void;
  gainXp: (amount: number, opts?: { correct?: boolean; resetCombo?: boolean }) => void;
  resetCombo: () => void;
  setDailyGoal: (goal: number) => void;
  dismissCelebration: () => void;

  // профиль
  updateProfile: (patch: Partial<Profile>) => void;
}

const clone = (): Record<string, Subject> => JSON.parse(JSON.stringify(SUBJECTS));

// ——— персист гейм-состояния в localStorage ———
const GKEY = "egehack.game.v1";
function loadGame(): GameState {
  if (typeof window === "undefined") return DEFAULT_GAME;
  try {
    const raw = localStorage.getItem(GKEY);
    if (raw) return { ...DEFAULT_GAME, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_GAME;
}
function saveGame(g: GameState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GKEY, JSON.stringify(g));
  } catch {
    /* ignore */
  }
}

const PKEY = "egehack.profile.v1";
function loadProfile(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PKEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...DEFAULT_PROFILE, ...p, notify: { ...DEFAULT_PROFILE.notify, ...(p.notify ?? {}) } };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PROFILE;
}
function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PKEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

let pingId = 0;

export const useApp = create<AppState>((set, get) => ({
  subjectKey: LIVE_KEYS[0] ?? "rus",
  mode: "student",
  theme: "dark",
  screen: "landing",
  selectedId: null,
  focusId: null,
  lightMode: false,
  critOpen: false,
  solveFloorId: null,
  modal: null,
  sheet: null,
  data: clone(),

  profile: DEFAULT_PROFILE, // реальное значение подтянется ensureDay() после маунта

  game: DEFAULT_GAME, // реальное значение подтянется ensureDay() после маунта
  celebrationQueue: [],
  xpPing: null,

  subject: () => get().data[get().subjectKey],
  floorById: (id) =>
    id ? get().data[get().subjectKey]?.floors.find((f) => f.id === id) : undefined,

  setScreen: (screen) => set({ screen, sheet: null }),

  setSubject: (subjectKey) => {
    if (!LIVE_KEYS.includes(subjectKey)) return;
    set({ subjectKey, selectedId: null, focusId: null, critOpen: false });
  },

  setMode: (mode) =>
    set(() => (mode === "parent" ? { mode, focusId: null, selectedId: null } : { mode })),

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((st) => ({ theme: st.theme === "dark" ? "light" : "dark" })),

  toggleLight: () => set((st) => ({ lightMode: !st.lightMode })),

  selectFloor: (id, opts) =>
    set((st) => ({
      selectedId: id,
      focusId: opts?.zoom ? id : st.focusId,
      critOpen: id !== st.selectedId ? false : st.critOpen,
      mode: "student",
    })),

  closeInspector: () => set({ selectedId: null, focusId: null }),
  setCritOpen: (critOpen) => set({ critOpen }),
  openSolve: (id) => set({ solveFloorId: id, screen: "solve" }),
  openModal: (kind, floorId) => set({ modal: { kind, floorId } }),
  setSheet: (sheet) => set({ sheet }),
  closeModal: () => set({ modal: null }),

  // ИММУТАБЕЛЬНОЕ обновление этажа (исправляет реактивность: подписчики
  // s.subject() теперь видят новую ссылку). Празднует, если этаж стал монолитом.
  bump: (id, dProg, dStab) =>
    set((st) => {
      const subj = st.data[st.subjectKey];
      if (!subj) return {};
      const before = subj.floors.find((x) => x.id === id);
      const wasSolid = before ? floorState(before) === "solid" : false;

      const floors = subj.floors.map((f) =>
        f.id === id
          ? {
              ...f,
              prog: Math.min(100, f.prog + dProg),
              stab: Math.min(100, f.stab + dStab),
            }
          : f
      );
      const after = floors.find((x) => x.id === id);
      const nowSolid = after ? floorState(after) === "solid" : false;

      const next: Partial<AppState> = {
        data: { ...st.data, [st.subjectKey]: { ...subj, floors } },
      };
      // веха: этаж затвердел → в очередь празднований
      if (!wasSolid && nowSolid && after) {
        next.celebrationQueue = [
          ...st.celebrationQueue,
          {
            kind: "floor-solid",
            title: "Этаж затвердел!",
            subtitle: `«${after.name}» больше не дрожит — диапазон сузился.`,
          },
        ];
      }
      return next;
    }),

  // вызывать при входе на экран Шпиля: подтянуть персист + откатить день
  ensureDay: () =>
    set((st) => {
      const loaded = st.game === DEFAULT_GAME ? loadGame() : st.game;
      const { state, newDay } = rolloverDay(loaded);
      saveGame(state);
      const patch: Partial<AppState> = { game: state };
      // первый раз — подтянуть профиль из localStorage
      if (st.profile === DEFAULT_PROFILE) patch.profile = loadProfile();
      // первый заход за сегодня и серия выросла → празднование серии
      if (newDay && state.streak > loaded.streak) {
        patch.celebrationQueue = [
          ...st.celebrationQueue,
          {
            kind: "streak",
            title: `${state.streak} ${pluralDays(state.streak)} подряд!`,
            subtitle: "Серия продолжается. Не сбавляй темп.",
          },
        ];
      }
      return patch;
    }),

  gainXp: (amount, opts) =>
    set((st) => {
      const res = award(st.game, amount, opts);
      saveGame(res.state);
      const patch: Partial<AppState> = {
        game: res.state,
        xpPing: { id: ++pingId, amount: res.gained },
      };
      // оба события могут произойти разом — добавляем в очередь, не затирая друг друга
      const queued: Celebration[] = [];
      if (res.leveledUp) {
        queued.push({
          kind: "level-up",
          title: `Уровень ${res.newLevel}!`,
          subtitle: "Шпиль набирает мощь. Так держать.",
        });
      }
      if (res.goalReached) {
        queued.push({
          kind: "goal",
          title: "Дневная цель взята!",
          subtitle: `+${st.game.dailyGoal} XP за сегодня. Кольцо закрыто.`,
        });
      }
      if (queued.length) patch.celebrationQueue = [...st.celebrationQueue, ...queued];
      return patch;
    }),

  resetCombo: () =>
    set((st) => {
      if (st.game.combo === 0) return {};
      const g = { ...st.game, combo: 0 };
      saveGame(g);
      return { game: g };
    }),

  // Пользователь меняет дневную цель (темп у всех разный). Только clamp + persist;
  // award()/celebration НЕ дёргаем — смена цели не «достигает» её сама по себе.
  setDailyGoal: (goal) =>
    set((st) => {
      const dailyGoal = clampDailyGoal(goal);
      if (dailyGoal === st.game.dailyGoal) return {};
      const g = { ...st.game, dailyGoal };
      saveGame(g);
      return { game: g };
    }),

  dismissCelebration: () =>
    set((st) => ({ celebrationQueue: st.celebrationQueue.slice(1) })),

  updateProfile: (patch) =>
    set((st) => {
      const profile: Profile = {
        ...st.profile,
        ...patch,
        notify: { ...st.profile.notify, ...(patch.notify ?? {}) },
      };
      saveProfile(profile);
      return { profile };
    }),
}));

function pluralDays(n: number): string {
  const a = n % 10,
    b = n % 100;
  if (a === 1 && b !== 11) return "день";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "дня";
  return "дней";
}
