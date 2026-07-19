"use client";

import { useProfileSync } from "@/lib/sync/useProfileSync";

/**
 * Невидимый компонент — только запускает синхронизацию store с БД
 * для авторизованного пользователя. Ставим в layout внутри AuthProvider.
 */
export function SyncBridge() {
  useProfileSync();
  return null;
}
