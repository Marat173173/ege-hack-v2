import type { Metadata, Viewport } from "next";
import { fontVars } from "./fonts";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthButton } from "@/components/auth/AuthButton";

export const metadata: Metadata = {
  title: "ЕГЭ-ХАК · Взломай экзамен",
  description:
    "ИИ-репетитор показывает, как именно тебя оценят на ЕГЭ/ОГЭ, и докручивает ответ до максимального балла.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // пинч-зум РАЗРЕШЁН (WCAG 1.4.4 Resize text): намеренно НЕ задаём maximumScale
  // и userScalable — иначе слабовидящие не могут увеличить мелкие HUD-лейблы.
  // Авто-зум полей при фокусе уже погашен @media(pointer:coarse){font-size:16px}.
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
        <AuthProvider>
          {/* кнопка ИИ-репетитора теперь контекстная — её рендерит Inspector
              над шитом открытой темы (только Шпиль/Тропа + открытый модуль) */}
          {children}

          {/* Плавающая кнопка входа/аккаунта — правый верхний угол */}
          <div
            className="pointer-events-none fixed right-3 z-40 sm:right-4"
            style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <div className="pointer-events-auto">
              <AuthButton />
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
