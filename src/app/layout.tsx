import type { Metadata, Viewport } from "next";
import { fontVars } from "./fonts";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SyncBridge } from "@/components/auth/SyncBridge";
import { SyncLoadingOverlay } from "@/components/auth/SyncLoadingOverlay";

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
          {/* Прозрачный мост синхронизации store <-> БД (только для авторизованных) */}
          <SyncBridge />
          <SyncLoadingOverlay />

          {/* кнопка ИИ-репетитора теперь контекстная — её рендерит Inspector
              над шитом открытой темы (только Шпиль/Тропа + открытый модуль) */}
          {/* Вход/регистрация НЕ живут отдельной плавающей кнопкой: раньше она
              стояла в правом верхнем углу с z-40 и полностью накрывала
              переключатель темы из TopBar (z-4), перехватывая его клики.
              Теперь аккаунт — одна точка входа: аватар в TopBar на десктопе и
              вкладка «Профиль» на мобиле, обе ведут в «Личный кабинет», где
              лежит блок входа и регистрации. */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
