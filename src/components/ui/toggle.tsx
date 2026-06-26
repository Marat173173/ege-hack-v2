"use client";

import * as React from "react";

/** iOS-style переключатель на токенах темы. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-[26px] w-[46px] shrink-0 rounded-full border transition-colors"
      style={{
        background: checked ? "rgb(var(--accent))" : "rgb(var(--glass-hi) / 0.08)",
        borderColor: checked ? "rgb(var(--accent))" : "rgb(var(--line) / 0.4)",
      }}
    >
      <span
        className="absolute top-[2px] h-[20px] w-[20px] rounded-full transition-transform"
        style={{
          left: 2,
          transform: checked ? "translateX(20px)" : "translateX(0)",
          background: checked ? "rgb(var(--bg-0))" : "rgb(var(--mid))",
        }}
      />
    </button>
  );
}
