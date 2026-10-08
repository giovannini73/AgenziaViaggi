export function nowIso(): string {
  return new Date().toISOString()
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status)
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'local'
  )
}

export function clampInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return null
  const i = Math.round(n)
  if (i < min || i > max) return null
  return i
}

export function asString(value: unknown, max: number): string {
  if (value == null) return ''
  return String(value).trim().slice(0, max)
}

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56)
  return `${base || 'itinerario'}-${crypto.randomUUID().slice(0, 8)}`
}

export function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 12)
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return parseTags(parsed)
    } catch {
      return raw
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12)
    }
  }
  return []
}

export function durationDays(start: string | null, end: string | null, nights: number): number {
  if (start && end) {
    const a = Date.parse(start)
    const b = Date.parse(end)
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
      return Math.round((b - a) / 86400000) + 1
    }
  }
  return nights > 0 ? nights + 1 : 0
}

export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null
  try {
    const url = new URL(origin)
    const host = url.hostname
    if (host === 'localhost' || host === '127.0.0.1') return origin
    if (host.endsWith('.workers.dev') || host.endsWith('.pages.dev')) return origin
    return null
  } catch {
    return null
  }
}
