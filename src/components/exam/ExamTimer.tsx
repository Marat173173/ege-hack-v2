"use client";

import * as React from "react";
import { Clock } from "lucide-react";

/**
 * Таймер пробника. Считает оставшееся время как:
 *   remaining = duration - ((now - startedAt) - pausedMillis - активная пауза)
 *
 * На паузе (pausedAt != null) секундная стрелка не идёт — remaining
 * пересчитывается от pausedAt, а не от текущего времени.
 */

export function ExamTimer({
  startedAt,
  durationMinutes,
  pausedAt,
  pausedMillis,
  onExpire,
}: {
  startedAt: string;
  durationMinutes: number;
  pausedAt: string | null;
  pausedMillis: number;
  onExpire: () => void;
}) {
  const durationMs = durationMinutes * 60_000;
  const startedMs = React.useMemo(() => new Date(startedAt).getTime(), [startedAt]);
  const pausedAtMs = pausedAt ? new Date(pausedAt).getTime() : null;

  const computeRemaining = React.useCallback(() => {
    const anchor = pausedAtMs ?? Date.now();
    const elapsed = anchor - startedMs - pausedMillis;
    return durationMs - elapsed;
  }, [durationMs, pausedAtMs, pausedMillis, startedMs]);

  const [remaining, setRemaining] = React.useState(computeRemaining);
  const expiredRef = React.useRef(false);

  React.useEffect(() => {
    setRemaining(computeRemaining());
    // На паузе тикать незачем — значение не меняется, пока не придёт resume
    if (pausedAtMs !== null) return;

    const id = setInterval(() => {
      setRemaining(computeRemaining());
    }, 1000);
    return () => clearInterval(id);
  }, [computeRemaining, pausedAtMs]);

  React.useEffect(() => {
    if (remaining <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire();
    }
  }, [remaining, onExpire]);

  const clamped = Math.max(0, remaining);
  const totalSeconds = Math.floor(clamped / 1000);
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;

  const label =
    hh > 0
      ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
      : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  const minutesLeft = totalSeconds / 60;
  const color =
    minutesLeft > 30
      ? "#5BE3B0"
      : minutesLeft >= 10
        ? "#F2B344"
        : "#F26B5B";

  return (
    <div
      className="flex h-11 items-center gap-1.5 rounded-xl border px-2.5 font-mono text-[13px] font-bold tabular-nums sm:px-3 sm:text-[14px]"
      style={{
        color,
        borderColor: `${color}4d`,
        background: `${color}1a`,
      }}
    >
      <Clock size={14} />
      {pausedAtMs !== null ? "на паузе" : label}
    </div>
  );
}
