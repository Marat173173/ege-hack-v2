import type { Metadata, Viewport } from "next";
import { fontVars } from "./fonts";
import "./globals.css";
import { TutorFAB } from "@/components/tutor/TutorFAB";

export const metadata: Metadata = {
  title: "ЕГЭ-ХАК · Взломай экзамен",
  description:
    "ИИ-репетитор показывает, как именно тебя оценят на ЕГЭ/ОГЭ, и докручивает ответ до максимального балла.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <body>
        {children}
        <TutorFAB />
      </body>
    </html>
  );
}
