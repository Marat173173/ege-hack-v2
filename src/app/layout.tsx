import type { Metadata, Viewport } from "next";
import { fontVars } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "ЕГЭ-ХАК · Взломай экзамен",
  description:
    "ИИ-репетитор показывает, как именно тебя оценят на ЕГЭ/ОГЭ, и докручивает ответ до максимального балла.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ВАЖНО: пинч-зум НЕ блокируем (a11y / WCAG 1.4.4). iOS-авто-зум при фокусе
  // инпута лечится правилом «инпуты ≥16px на тач» в globals.css, а не запретом зума.
  viewportFit: "cover", // под вырезы/«чёлки» — env(safe-area-inset-*)
  themeColor: "#070A14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" data-theme="dark" className={fontVars} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
