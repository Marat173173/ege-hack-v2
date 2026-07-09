/**
 * Серверное чтение анонимного идентификатора.
 *
 * Клиент хранит anonId в localStorage и дублирует в cookie "anon_id"
 * (см. src/lib/anon-id.ts). Роуты обычно получают anonId явно
 * (body у POST, ?anonId= у GET); cookie — запасной канал.
 */

const ANON_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

/** UUID и заглушка "anon-stub" проходят, мусор и пустая строка — нет. */
export function isValidAnonId(value: unknown): value is string {
  return typeof value === "string" && ANON_ID_RE.test(value);
}

/**
 * anonId из query (?anonId=) либо из cookie "anon_id".
 * Body здесь не читается (стрим одноразовый) — POST-роуты сначала
 * проверяют anonId из распарсенного body, потом зовут этот fallback.
 */
export function readAnonId(req: Request): string | null {
  const fromQuery = new URL(req.url).searchParams.get("anonId");
  if (isValidAnonId(fromQuery)) return fromQuery;

  const cookieHeader = req.headers.get("cookie") ?? "";
  const fromCookie = cookieHeader.match(/(?:^|;\s*)anon_id=([^;]+)/)?.[1];
  return isValidAnonId(fromCookie) ? fromCookie : null;
}
