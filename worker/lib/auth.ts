import { SITE_PEOPLE, type SiteUser } from '../../shared/types'
import { enforceRateLimit } from './rateLimit'
import { asString, clientIp, error, json } from './util'

const COOKIE = 'amorini_access'
const THIRTY_DAYS = 60 * 60 * 24 * 30

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

async function passwordToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`amorini-access:${password}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('Cookie')
  if (!raw) return null
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim())
  }
  return null
}

function cookieFlags(request: Request, maxAge: number): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

type ConfiguredUser = SiteUser & { password: string }

function configuredUsers(env: Env): ConfiguredUser[] {
  const users: ConfiguredUser[] = []
  const sabrina = env.SITE_PASSWORD?.trim()
  const claudio = env.SITE_PASSWORD_CLAUDIO?.trim()
  if (sabrina) users.push({ id: 'sabrina', name: 'Sabrina', password: sabrina })
  if (claudio) users.push({ id: 'claudio', name: 'Claudio', password: claudio })
  return users
}

export function accessConfigured(env: Env): boolean {
  return configuredUsers(env).length > 0
}

export function isPublicPath(pathname: string, method: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (method === 'OPTIONS') return true
  if (path === '/api/login' && method === 'POST') return true
  if (path === '/api/logout' && (method === 'POST' || method === 'GET')) return true
  if (path === '/accedi') return true
  if (pathname.startsWith('/assets/')) return true
  if (pathname.startsWith('/src/') || pathname.startsWith('/node_modules/')) return true
  if (pathname.startsWith('/@') || pathname.startsWith('/__')) return true
  if (pathname === '/favicon.svg' || pathname === '/icons.svg') return true
  if (/\.(css|js|map|mjs|woff2?|png|jpe?g|svg|ico)$/i.test(pathname)) return true
  return false
}

export async function identifyUser(request: Request, env: Env): Promise<SiteUser | null> {
  const cookie = readCookie(request, COOKIE)
  if (!cookie) return null
  let found: SiteUser | null = null
  for (const user of configuredUsers(env)) {
    const expected = await passwordToken(user.password)
    if (timingSafeEqual(cookie, expected)) found = { id: user.id, name: user.name }
  }
  return found
}

export async function hasAccess(request: Request, env: Env): Promise<boolean> {
  if (!accessConfigured(env)) return true
  return (await identifyUser(request, env)) != null
}

export async function loginResponse(request: Request, env: Env): Promise<Response> {
  const users = configuredUsers(env)
  if (!users.length) return error('Accesso non configurato', 503)

  if (!(await enforceRateLimit(env.DB, clientIp(request), 'login'))) {
    return error('Troppi tentativi. Riprova tra un minuto.', 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error('Richiesta non valida', 400)
  }

  const given = asString((body as { password?: unknown }).password, 200)
  const received = await passwordToken(given || '\0')
  let matched: ConfiguredUser | null = null
  for (const user of users) {
    const expected = await passwordToken(user.password)
    if (given && timingSafeEqual(expected, received)) matched = user
  }
  if (!matched) return error('Password non corretta', 401)

  const token = await passwordToken(matched.password)
  const res = json({ ok: true, user: { id: matched.id, name: matched.name } })
  res.headers.set('Set-Cookie', `${COOKIE}=${token}; ${cookieFlags(request, THIRTY_DAYS)}`)
  return res
}

export function logoutResponse(request: Request): Response {
  const res = json({ ok: true })
  res.headers.set('Set-Cookie', `${COOKIE}=; ${cookieFlags(request, 0)}`)
  return res
}

export function meResponse(user: SiteUser): Response {
  return json({
    id: user.id,
    name: user.name,
    people: SITE_PEOPLE.map((person) => ({ id: person.id, name: person.name })),
  })
}

export function redirectToLogin(request: Request): Response {
  const url = new URL(request.url)
  const accedi = new URL('/accedi', url)
  const next = `${url.pathname}${url.search}`
  if (next && next !== '/' && !next.startsWith('/accedi')) {
    accedi.searchParams.set('next', next)
  }
  return Response.redirect(accedi, 302)
}
