"use client";

import * as React from "react";

/**
 * Логотип-марка «Шпиль»: вертикальная ось, пронзающая стопку этажей,
 * сужающихся кверху. Тот самый знак из фирстиля (фото-логотип).
 * Используется как иконка бургер-кнопки и в брендинге.
 */
export function SpireMark({
  size = 24,
  className,
  strokeWidth = 2.4,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* вертикальная ось-шпиль */}
      <path d="M12 3.2 L12 20.8" />
      {/* этажи: шире снизу, уже кверху */}
      <path d="M5.5 17.4 L18.5 17.4" />
      <path d="M7 13 L17 13" />
      <path d="M8.7 8.8 L15.3 8.8" />
    </svg>
  );
}

export default SpireMark;
