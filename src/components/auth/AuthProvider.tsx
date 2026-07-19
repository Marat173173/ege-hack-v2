"use client";

import { SessionProvider } from "next-auth/react";
import * as React from "react";

/**
 * Клиентская обёртка над NextAuth SessionProvider.
 * Оборачивает всё приложение — благодаря ей хук useSession()
 * работает в любых компонентах.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
