"use client";

import { create } from "zustand";
import { SUBJECTS, LIVE_KEYS, type Subject } from "@/data/catalog";
import { floorState } from "@/lib/floor-state";
import { DEFAULT_GAME, award, rolloverDay, clampDailyGoal, comboRecordMilestone, type GameState } from "@/lib/gamification";
import { DEFAULT_PROFILE, type Profile } from "@/lib/profile";
import type { MistakeItem } from "@/components/screens/ResultsScreen";

type Mode = "student" | "parent";
export type Theme = "light" | "dark";
export type Screen =
  | "landing"
  | "onboarding"
  | "diagnostic"
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
  | { kind: "streak"; title: string; subtitle: string }
  | { kind: "record"; title: string; subtitle: string }
  | { kind: "section"; title: string; subtitle: string };

/** «Тост» прилёта XP (для всплывашек +N). */
export interface XpPing {
  id: number;
  amount: number;
}

/** «Сообщение репетитора» — предложение разобрать ошибки после среза. */
export interface TutorNudge {
  id: string;
  kind: "review" | "followup";
  floorId: string;
  floorName: string;
  subjectKey: string;
  correct?: number;
  total?: number;
  mistakes?: MistakeItem[];
  createdAt: number;
  status: "pending" | "accepted" | "declined";
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

  // ——— «репетитор пишет» (nudge) ———
  tutorNudge: TutorNudge | null;
  /** Показ превью-тоста (не персистится: показом рулит Page). */
  nudgeVisible: boolean;

  // ——— спотлайт-тур (не персистится: done-флаг живёт в lib/tour) ———
  tourActive: boolean;

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
  /** Входной срез: выставить АБСОЛЮТНЫЙ уровень этажа (prog/stab 0..100). */
  calibrate: (id: string, prog: number, stab: number) => void;

  // гейм-экшены
  ensureDay: () => void;
  gainXp: (amount: number, opts?: { correct?: boolean; resetCombo?: boolean }) => void;
  resetCombo: () => void;
  setDailyGoal: (goal: number) => void;
  dismissCelebration: () => void;
  dismissAllCelebrations: () => void;

  // профиль
  updateProfile: (patch: Partial<Profile>) => void;

  // nudge-экшены
  offerNudge: (n: Omit<TutorNudge, "id" | "createdAt" | "status">) => void;
  resolveNudge: (status: "accepted" | "declined") => void;
  hydrateNudge: () => void;
  showNudge: () => void;
  hideNudge: () => void;

  setTourActive: (v: boolean) => void;
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

const NKEY = "egehack.nudge.v1";
function loadNudge(): TutorNudge | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(NKEY);
    if (raw) {
      const n = JSON.parse(raw) as Partial<TutorNudge>;
      // битый/старый ключ не должен давать «тест по „undefined“» в чате
      const ok =
        n &&
        typeof n.id === "string" &&
        typeof n.floorId === "string" &&
        typeof n.floorName === "string" &&
        typeof n.subjectKey === "string" &&
        (n.kind === "review" || n.kind === "followup") &&
        (n.status === "pending" || n.status === "accepted" || n.status === "declined");
      if (ok) return n as TutorNudge;
    }
  } catch {
    /* ignore */
  }
  return null;
}
function saveNudge(n: TutorNudge) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NKEY, JSON.stringify(n));
  } catch {
    /* ignore */
  }
}

function genNudgeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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

  tutorNudge: null, // реальное значение подтянется hydrateNudge() после маунта
  nudgeVisible: false,

  tourActive: false,

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
        // сколько этажей предмета были монолитом ДО этого перехода
        // (сам этаж не был solid — исключать его не нужно)
        const solidBefore = subj.floors.filter((f) => floorState(f) === "solid").length;
        next.celebrationQueue = [
          ...st.celebrationQueue,
          solidBefore === 0
            ? {
                kind: "floor-solid",
                title: "Первый монолит!",
                subtitle: "Первая тема доведена до конца. Так строится вся башня.",
              }
            : {
                kind: "floor-solid",
                title: "Этаж затвердел!",
                subtitle: `«${after.name}» больше не дрожит — диапазон сузился.`,
              },
        ];
        // веха: раздел ФИПИ закрыт — все этажи с этим префиксом секции теперь монолит
        if (/^\d+\.\d+/.test(after.id)) {
          const section = after.id.split(".")[0];
          const inSection = floors.filter(
            (f) => /^\d+\.\d+/.test(f.id) && f.id.split(".")[0] === section
          );
          if (inSection.every((f) => floorState(f) === "solid")) {
            next.celebrationQueue = [
              ...next.celebrationQueue,
              {
                kind: "section",
                title: `Раздел ${section} закрыт!`,
                subtitle: "Все темы раздела — монолит.",
              },
            ];
          }
        }
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
      // первый заход за сегодня и серия выросла → празднование серии;
      // каждые 7 дней — редкая веха «неделя огня» вместо ежедневной формулировки
      if (newDay && state.streak > loaded.streak) {
        const weeks = state.streak / 7;
        patch.celebrationQueue = [
          ...st.celebrationQueue,
          state.streak % 7 === 0
            ? {
                kind: "streak",
                title:
                  state.streak > 7
                    ? `${weeks} ${pluralWeeks(weeks)} огня!`
                    : "Неделя огня!",
                subtitle: `${state.streak} ${pluralDays(state.streak)} подряд без единого пропуска.`,
              }
            : {
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
      // веха: рекорд комбо (редко — только на кратных 5, иначе спам на длинной серии)
      if (comboRecordMilestone(st.game.bestCombo, res.state.bestCombo)) {
        queued.push({
          kind: "record",
          title: `Рекорд: ${res.state.bestCombo} подряд!`,
          subtitle: "Лучшая серия верных ответов — комбо-множитель тащит.",
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

  // пропустить ВСЮ очередь разом (Escape / тап по сводному оверлею) —
  // чтобы лавина вех не блокировала экран на 20+ секунд
  dismissAllCelebrations: () => set({ celebrationQueue: [] }),

  // входной срез: абсолютная установка уровня этажа (не дельта, как bump)
  calibrate: (id, prog, stab) =>
    set((st) => {
      const subj = st.data[st.subjectKey];
      if (!subj) return {};
      const floors = subj.floors.map((f) =>
        f.id === id
          ? {
              ...f,
              prog: Math.max(0, Math.min(100, Math.round(prog))),
              stab: Math.max(0, Math.min(100, Math.round(stab))),
            }
          : f
      );
      return { data: { ...st.data, [st.subjectKey]: { ...subj, floors } } };
    }),

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

  // Новое предложение репетитора: pending review всегда замещается свежим —
  // разбирать актуальнее последнюю сессию. Persist СИНХРОННЫЙ: вызов из
  // finish() в Solve должен пережить window.location.href-переход на /tutor.
  offerNudge: (n) => {
    const nudge: TutorNudge = {
      ...n,
      id: genNudgeId(),
      createdAt: Date.now(),
      status: "pending",
    };
    saveNudge(nudge);
    set({ tutorNudge: nudge });
  },

  resolveNudge: (status) =>
    set((st) => {
      if (!st.tutorNudge) return {};
      const tutorNudge: TutorNudge = { ...st.tutorNudge, status };
      saveNudge(tutorNudge);
      return { tutorNudge, nudgeVisible: false };
    }),

  // вызывать на маунте Page: подтянуть сообщение из localStorage
  hydrateNudge: () => {
    const tutorNudge = loadNudge();
    if (tutorNudge) set({ tutorNudge });
  },

  showNudge: () => set({ nudgeVisible: true }),
  hideNudge: () => set({ nudgeVisible: false }),

  setTourActive: (tourActive) => set({ tourActive }),
}));

function pluralWeeks(n: number): string {
  const a = n % 10,
    b = n % 100;
  if (a === 1 && b !== 11) return "неделя";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "недели";
  return "недель";
}

function pluralDays(n: number): string {
  const a = n % 10,
    b = n % 100;
  if (a === 1 && b !== 11) return "день";
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "дня";
  return "дней";
}
