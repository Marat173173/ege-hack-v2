import localFont from "next/font/local";

/**
 * Шрифты проекта (самохостинг через next/font — без FOUT, с preload).
 * Логика по требованию:
 *   - обычный текст                → Iosevka Charon       (--font-sans)
 *   - болды / заголовки / выделения → Alfa Slab One        (--font-display)
 *   - акцентный / HUD / логика      → Bitcount Grid Double (--font-mono)
 *   - тёплые «от руки» акценты      → Caveat (рукописный)  (--font-hand)
 */

export const iosevka = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "./fonts/IosevkaCharon-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/IosevkaCharon-Italic.ttf", weight: "400", style: "italic" },
    { path: "./fonts/IosevkaCharon-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/IosevkaCharon-Bold.ttf", weight: "700", style: "normal" },
  ],
});

export const alfaSlab = localFont({
  variable: "--font-display",
  display: "swap",
  src: [{ path: "./fonts/AlfaSlabOne-Regular.ttf", weight: "400", style: "normal" }],
});

export const bitcount = localFont({
  variable: "--font-mono",
  display: "swap",
  src: [
    { path: "./fonts/BitcountGridDouble_Roman-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/BitcountGridDouble_Roman-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/BitcountGridDouble_Roman-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
});

/** Рукописный акцент — Caveat (локальный вариативный файл, латиница + кириллица). */
export const caveat = localFont({
  variable: "--font-hand",
  display: "swap",
  src: [{ path: "./fonts/Caveat-Variable.ttf", weight: "400 700", style: "normal" }],
});

export const fontVars = `${iosevka.variable} ${alfaSlab.variable} ${bitcount.variable} ${caveat.variable}`;
