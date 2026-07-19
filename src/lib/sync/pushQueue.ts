/**
 * Утилита «отложенной отправки» для API-синхронизации.
 *
 * При частых изменениях (клики в тренировке, набегающий XP) мы не хотим
 * стучаться в API на каждый чих. Собираем последнее состояние и отправляем
 * его через delayMs миллисекунд после последнего вызова.
 *
 * Если во время ожидания приходит новое значение — таймер сбрасывается,
 * запускается заново, и отправится уже свежее значение. Так после серии
 * из 20 обновлений подряд летит один запрос с финальным state.
 *
 * Fire-and-forget: если сеть недоступна, ошибка уходит в console.warn.
 * UI не блокируется — при следующем изменении будет новая попытка.
 */

export type PushFn<T> = (data: T) => void;

export function createDebouncedPush<T>(opts: {
  url: string;
  method: "PATCH" | "POST" | "PUT";
  delayMs?: number;
}): PushFn<T> {
  const { url, method, delayMs = 2000 } = opts;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | null = null;

  return function push(data: T) {
    pending = data;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      const payload = pending;
      pending = null;
      timer = null;
      if (payload == null) return;
      try {
        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "same-origin",
        });
      } catch (err) {
        console.warn(`[sync] push failed (${method} ${url}):`, err);
      }
    }, delayMs);
  };
}
