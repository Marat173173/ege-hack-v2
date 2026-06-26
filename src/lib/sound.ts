"use client";

/**
 * Лёгкие звуки через WebAudio — без аудиофайлов.
 * Уважает prefers-reduced-motion (там тоже отключаем звук) и работает
 * только после первого жеста пользователя (политика автоплея).
 */

let ctx: AudioContext | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return null;
  }
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  when: number,
  gain = 0.06
) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Верный ответ — короткий мажорный «динь-дон» вверх. */
export function playCorrect() {
  if (!enabled) return;
  tone(660, 0.12, "sine", 0);
  tone(880, 0.16, "sine", 0.08);
}

/** Неверный — мягкий, не наказывающий низкий бип. */
export function playWrong() {
  if (!enabled) return;
  tone(196, 0.18, "sine", 0, 0.05);
}

/** Комбо-щелчок — выше с ростом серии. */
export function playCombo(combo: number) {
  if (!enabled) return;
  const f = 520 + Math.min(combo, 10) * 60;
  tone(f, 0.09, "triangle", 0, 0.05);
}

/** Празднование — восходящее арпеджио. */
export function playCelebrate() {
  if (!enabled) return;
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "sine", i * 0.09, 0.06));
}

/** Прилёт XP — лёгкий «бллип». */
export function playXp() {
  if (!enabled) return;
  tone(740, 0.07, "triangle", 0, 0.04);
}
