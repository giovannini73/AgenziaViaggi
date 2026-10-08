const WINDOWS = {
  comment: { max: 8, ms: 60_000 },
  rating: { max: 20, ms: 60_000 },
  write: { max: 30, ms: 60_000 },
  media: { max: 20, ms: 60_000 },
  ai: { max: 5, ms: 60_000 },
  login: { max: 10, ms: 60_000 },
} as const

export type RateKind = keyof typeof WINDOWS

export async function enforceRateLimit(
  db: D1Database,
  ip: string,
  kind: RateKind,
): Promise<boolean> {
  const { max, ms } = WINDOWS[kind]
  const key = `${kind}:${ip}`
  const now = Date.now()
  const row = await db
    .prepare('SELECT count, window_start FROM rate_limits WHERE key = ?')
    .bind(key)
    .first<{ count: number; window_start: number }>()

  if (!row || now - row.window_start >= ms) {
    await db
      .prepare(
        'INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = ?',
      )
      .bind(key, now, now)
      .run()
    return true
  }

  if (row.count >= max) return false

  await db
    .prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?')
    .bind(key)
    .run()
  return true
}
