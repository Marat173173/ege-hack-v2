/**
 * Rate limiting для API-роутов.
 *
 * Использует Upstash Redis (sliding window) в проде. Если переменные
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN не заданы — работает
 * в fallback-режиме на in-memory Map, чтобы можно было гонять dev-сервер
 * локально без Redis. In-memory режим не переживает рестарт процесса и
 * не шарится между инстансами — этого достаточно для локальной разработки,
 * но не годится для нескольких серверных инстансов в проде (там нужен Redis).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitConfig {
  /** Отличает разные роуты друг от друга в общем Redis/Map (напр. "register", "tutor-ask"). */
  identifier: string;
  limit: number;
  /** Окно в формате Upstash, напр. "1 m", "1 h". */
  window: `${number} ${"ms" | "s" | "m" | "h" | "d"}`;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// identifier → Ratelimit instance (лимит/окно фиксированы на identifier, кэшируем создание клиента)
const limiters = new Map<string, Ratelimit>();

function getLimiter(config: RateLimitConfig): Ratelimit {
  const key = `${config.identifier}:${config.limit}:${config.window}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(config.limit, config.window),
      prefix: `ratelimit:${config.identifier}`,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

// ─── Fallback: in-memory sliding window ────────────────────────

interface MemoryBucket {
  hits: number[]; // timestamps (ms) внутри текущего окна
}

const memoryStore = new Map<string, MemoryBucket>();

function windowToMs(window: RateLimitConfig["window"]): number {
  const [amountStr, unit] = window.split(" ");
  const amount = Number(amountStr);
  const unitMs = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 1000;
  return amount * unitMs;
}

function checkMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const windowMs = windowToMs(config.window);
  const now = Date.now();
  const bucket = memoryStore.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= config.limit) {
    const retryAfter = Math.ceil((windowMs - (now - bucket.hits[0])) / 1000);
    memoryStore.set(key, bucket);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }

  bucket.hits.push(now);
  memoryStore.set(key, bucket);
  return { ok: true };
}

// Периодически подчищаем пустые/устаревшие бакеты, чтобы Map не росла бесконечно.
if (!redis && typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryStore) {
      bucket.hits = bucket.hits.filter((t) => now - t < 24 * 3_600_000);
      if (bucket.hits.length === 0) memoryStore.delete(key);
    }
  }, 5 * 60_000);
}

// ─── Публичный API ──────────────────────────────────────────────

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const ip = clientIp(request);
  const key = `${config.identifier}:${ip}`;

  if (redis) {
    const { success, reset } = await getLimiter(config).limit(key);
    if (success) return { ok: true };
    return { ok: false, retryAfter: Math.max(Math.ceil((reset - Date.now()) / 1000), 1) };
  }

  return checkMemory(key, config);
}
