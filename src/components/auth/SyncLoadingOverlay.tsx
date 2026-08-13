"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSyncStatus } from "@/lib/sync/useProfileSync";

/**
 * Блокирует UI, пока идёт первичная загрузка профиля/прогресса с сервера.
 *
 * Без этого пользователь мог кликнуть и стартовать тренировку до того,
 * как применились серверные данные — старые локальные значения затем
 * перезаписывали свежие серверные в БД.
 */
export function SyncLoadingOverlay() {
  const { status } = useSession();
  const { isInitialLoading } = useSyncStatus();

  if (status !== "authenticated" || !isInitialLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm">
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border px-8 py-7 text-center shadow-2xl"
        style={{
          background: "rgb(var(--bg-1))",
          borderColor: "rgb(var(--hi) / 0.12)",
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "rgb(var(--accent))" }} />
        <p className="text-sm font-medium" style={{ color: "rgb(var(--hi))" }}>
          Загружаем твой прогресс…
        </p>
      </div>
    </div>
  );
}
