import { Hono } from 'hono'
import type { ItineraryInput } from '../../shared/types'
import { arrivalDate } from '../../shared/schedule'
import { copyItineraryVotes } from '../lib/copyVotes'
import { deleteItineraryCascade, ensureSeed, getItinerary, listItineraries, replaceStops, saveRevision, touchItinerary } from '../lib/db'
import { enforceRateLimit } from '../lib/rateLimit'
import { clientIp, error, json, nowIso, slugify } from '../lib/util'
import { validateItinerary } from '../lib/validate'

type AppEnv = { Bindings: Env }

export const itineraries = new Hono<AppEnv>()

itineraries.get('/', async (c) => {
  await ensureSeed(c.env.DB)
  const items = await listItineraries(c.env.DB)
  const url = new URL(c.req.url)
  const q = (url.searchParams.get('q') || '').trim().toLowerCase()
  const country = (url.searchParams.get('country') || '').trim().toLowerCase()
  const style = (url.searchParams.get('style') || '').trim().toLowerCase()
  const duration = url.searchParams.get('duration') || ''
  const tags = (url.searchParams.get('tags') || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  const filtered = items.filter((item) => {
    if (country && !item.country.toLowerCase().includes(country)) return false
    if (style && !item.travel_style.toLowerCase().includes(style)) return false
    if (q) {
      const blob = `${item.title} ${item.description} ${item.start_city} ${item.end_city} ${item.country}`.toLowerCase()
      if (!blob.includes(q)) return false
    }
    if (tags.length && !tags.every((t) => item.tags.includes(t))) return false
    if (duration === 'short' && item.duration_days > 7) return false
    if (duration === 'medium' && (item.duration_days < 8 || item.duration_days > 14)) return false
    if (duration === 'long' && (item.duration_days < 15 || item.duration_days > 21)) return false
    if (duration === 'xl' && item.duration_days < 22) return false
    return true
  })
  return json(filtered)
})

itineraries.get('/:id', async (c) => {
  await ensureSeed(c.env.DB)
  const item = await getItinerary(c.env.DB, c.req.param('id'))
  if (!item) return error('Itinerario non trovato', 404)
  return json(item)
})

itineraries.post('/', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) {
    return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const parsed = validateItinerary(await c.req.json())
  if (typeof parsed === 'string') return error(parsed)
  const id = crypto.randomUUID()
  const ts = nowIso()
  await c.env.DB
    .prepare(
      `INSERT INTO itineraries (id, title, slug, description, country, start_city, end_city, start_date, end_date, travel_style, cover_image, tags, recommended_period, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      parsed.title,
      slugify(parsed.title),
      parsed.description || '',
      parsed.country || '',
      parsed.start_city || '',
      parsed.end_city || '',
      parsed.start_date,
      parsed.end_date,
      parsed.travel_style || '',
      parsed.cover_image,
      JSON.stringify(parsed.tags || []),
      parsed.recommended_period || '',
      ts,
      ts,
    )
    .run()
  if (parsed.stops?.length) await replaceStops(c.env.DB, id, parsed.stops)
  return json(await getItinerary(c.env.DB, id), 201)
})

itineraries.put('/:id', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) {
    return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const id = c.req.param('id')
  const existing = await getItinerary(c.env.DB, id)
  if (!existing) return error('Itinerario non trovato', 404)
  const parsed = validateItinerary(await c.req.json(), true)
  if (typeof parsed === 'string') return error(parsed)
  await saveRevision(c.env.DB, id)
  const merged: ItineraryInput = {
    title: parsed.title || existing.title,
    description: parsed.description ?? existing.description,
    country: parsed.country ?? existing.country,
    start_city: parsed.start_city ?? existing.start_city,
    end_city: parsed.end_city ?? existing.end_city,
    start_date: parsed.start_date === undefined ? existing.start_date : parsed.start_date,
    end_date: arrivalDate(parsed.start_date === undefined ? existing.start_date : parsed.start_date, parsed.stops ?? existing.stops),
    travel_style: parsed.travel_style ?? existing.travel_style,
    cover_image: parsed.cover_image === undefined ? existing.cover_image : parsed.cover_image,
    tags: parsed.tags ?? existing.tags,
    recommended_period: parsed.recommended_period ?? existing.recommended_period,
  }
  await c.env.DB
    .prepare(
      `UPDATE itineraries SET title = ?, description = ?, country = ?, start_city = ?, end_city = ?, start_date = ?, end_date = ?, travel_style = ?, cover_image = ?, tags = ?, recommended_period = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      merged.title,
      merged.description || '',
      merged.country || '',
      merged.start_city || '',
      merged.end_city || '',
      merged.start_date,
      merged.end_date,
      merged.travel_style || '',
      merged.cover_image,
      JSON.stringify(merged.tags || []),
      merged.recommended_period || '',
      nowIso(),
      id,
    )
    .run()
  if (parsed.stops) await replaceStops(c.env.DB, id, parsed.stops)
  return json(await getItinerary(c.env.DB, id))
})

itineraries.delete('/:id', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) {
    return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const id = c.req.param('id')
  const existing = await getItinerary(c.env.DB, id)
  if (!existing) return error('Itinerario non trovato', 404)
  await deleteItineraryCascade(
    c.env.DB,
    id,
    existing.stops.map((s) => s.id),
  )
  return json({ ok: true })
})

itineraries.post('/:id/duplicate', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) {
    return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const existing = await getItinerary(c.env.DB, c.req.param('id'))
  if (!existing) return error('Itinerario non trovato', 404)
  const id = crypto.randomUUID()
  const ts = nowIso()
  const title = existing.title.startsWith('Copia di ') ? existing.title : `Copia di ${existing.title}`
  await c.env.DB
    .prepare(
      `INSERT INTO itineraries (id, title, slug, description, country, start_city, end_city, start_date, end_date, travel_style, cover_image, tags, recommended_period, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      title,
      slugify(title),
      existing.description,
      existing.country,
      existing.start_city,
      existing.end_city,
      existing.start_date,
      existing.end_date,
      existing.travel_style,
      existing.cover_image,
      JSON.stringify(existing.tags),
      existing.recommended_period,
      ts,
      ts,
    )
    .run()
  try {
    await replaceStops(
      c.env.DB,
      id,
      existing.stops.map(({ id: _id, itinerary_id: _it, avg_rating: _a, rating_count: _r, comments: _c, ...rest }) => rest),
    )
    await copyItineraryVotes(c.env.DB, existing.id, id)
  } catch (err) {
    const partialCopy = await getItinerary(c.env.DB, id)
    await deleteItineraryCascade(c.env.DB, id, partialCopy?.stops.map((stop) => stop.id) || [])
    throw err
  }
  return json(await getItinerary(c.env.DB, id), 201)
})

itineraries.get('/:id/revisions', async (c) => {
  const { results } = await c.env.DB
    .prepare(
      'SELECT id, itinerary_id, created_at FROM itinerary_revisions WHERE itinerary_id = ? ORDER BY created_at DESC LIMIT 20',
    )
    .bind(c.req.param('id'))
    .all()
  return json(results || [])
})

itineraries.post('/:id/restore', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) {
    return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const id = c.req.param('id')
  const body = (await c.req.json()) as { revision_id?: string }
  const rev = await c.env.DB
    .prepare('SELECT snapshot_json FROM itinerary_revisions WHERE id = ? AND itinerary_id = ?')
    .bind(body.revision_id || '', id)
    .first<{ snapshot_json: string }>()
  if (!rev) return error('Versione non trovata', 404)
  const snap = JSON.parse(rev.snapshot_json) as Awaited<ReturnType<typeof getItinerary>>
  if (!snap) return error('Istantanea non valida', 400)
  await saveRevision(c.env.DB, id)
  await c.env.DB
    .prepare(
      `UPDATE itineraries SET title = ?, description = ?, country = ?, start_city = ?, end_city = ?, start_date = ?, end_date = ?, travel_style = ?, cover_image = ?, tags = ?, recommended_period = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      snap.title,
      snap.description,
      snap.country,
      snap.start_city,
      snap.end_city,
      snap.start_date,
      snap.end_date,
      snap.travel_style,
      snap.cover_image,
      JSON.stringify(snap.tags),
      snap.recommended_period,
      nowIso(),
      id,
    )
    .run()
  await replaceStops(
    c.env.DB,
    id,
    snap.stops.map(({ id: stopId, itinerary_id: _it, avg_rating: _a, rating_count: _r, comments: _c, ...rest }) => ({
      ...rest,
      id: stopId,
    })),
  )
  return json(await getItinerary(c.env.DB, id))
})

itineraries.post('/:id/stops', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) {
    return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const id = c.req.param('id')
  const existing = await getItinerary(c.env.DB, id)
  if (!existing) return error('Itinerario non trovato', 404)
  const body = await c.req.json()
  const parsed = validateItinerary({ title: existing.title, stops: [...existing.stops, body] }, true)
  if (typeof parsed === 'string') return error(parsed)
  await saveRevision(c.env.DB, id)
  await replaceStops(c.env.DB, id, parsed.stops || [])
  await touchItinerary(c.env.DB, id)
  return json(await getItinerary(c.env.DB, id), 201)
})
