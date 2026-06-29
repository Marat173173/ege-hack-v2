import type { Config } from "tailwindcss";

/**
 * Дизайн-система ЕГЭ-ХАК (тёмный командный центр).
 * Цвет кодирует смысл: тёплый янтарь = Русский, холодный циан = Математика,
 * красный пульс = нестабильность, мятный = монолит.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  // hover:-утилиты применяем ТОЛЬКО там, где есть настоящий hover (@media (hover:hover)).
  // На тач-экранах это убирает «залипающий» :hover после тапа.
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        // фоны (следуют теме через CSS-переменные)
        "bg-0": "rgb(var(--bg-0) / <alpha-value>)",
        "bg-1": "rgb(var(--bg-1) / <alpha-value>)",
        "bg-2": "rgb(var(--bg-2) / <alpha-value>)",
        panel: "rgb(var(--glass-tint) / 0.72)",
        // линии
        line: "rgb(var(--line) / var(--line-a))",
        "line-2": "rgb(var(--line) / var(--line-2a))",
        border: "rgb(var(--line) / var(--line-a))",
        // текст
        hi: "rgb(var(--hi) / <alpha-value>)",
        mid: "rgb(var(--mid) / <alpha-value>)",
        lo: "rgb(var(--lo) / <alpha-value>)",
        // смысловые (одинаковы в обеих темах)
        danger: "#FF5C6E",
        stable: "#5BE3B0",
        warn: "#FFC65B",
        // акценты (через CSS-переменные, переключаются по предмету)
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-2": "rgb(var(--accent-2) / <alpha-value>)",
        // алиасы под шаблоны (shadcn-style: foreground/primary/ring)
        background: "rgb(var(--bg-0) / <alpha-value>)",
        foreground: "rgb(var(--hi) / <alpha-value>)",
        primary: "rgb(var(--accent) / <alpha-value>)",
        "primary-foreground": "rgb(var(--bg-0) / <alpha-value>)",
        ring: "rgb(var(--accent) / <alpha-value>)",
        muted: "rgb(var(--mid) / <alpha-value>)",
        "muted-foreground": "rgb(var(--lo) / <alpha-value>)",
      },
      fontFamily: {
        // обычный текст — Iosevka Charon
        sans: ["var(--font-sans)", "ui-monospace", "SFMono-Regular", "monospace"],
        // display / болды / выделения — Alfa Slab One (заменяет прежний serif-слот)
        serif: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        // акцент / HUD / логика выделения — Bitcount Grid Double
        mono: ["var(--font-mono)", "ui-monospace", '"SF Mono"', "Menlo", "monospace"],
        // тёплый рукописный акцент — Caveat
        hand: ["var(--font-hand)", '"Segoe Script"', "cursive"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
      },
      boxShadow: {
        panel: "0 24px 60px -28px rgba(0,0,0,.8)",
        glow: "0 0 40px -8px rgb(var(--accent) / 0.45)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "0% center" },
        },
        "glass-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
        lrise: {
          "0%, 100%": { opacity: "0.25", transform: "scaleX(.6)" },
          "50%": { opacity: "1", transform: "scaleX(1)" },
        },
        "sheen-move": {
          "0%": { transform: "translateX(-120%) skewX(-18deg)" },
          "100%": { transform: "translateX(220%) skewX(-18deg)" },
        },
      },
      animation: {
        shimmer: "shimmer 8s linear infinite",
        "glass-float": "glass-float 6s ease-in-out infinite",
        lrise: "lrise 1.3s infinite ease-in-out",
        sheen: "sheen-move 3.5s ease-in-out infinite",
        "spin-slow": "spin 5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
