import { Hono } from 'hono'
import { deleteStopCascade, getItinerary, getStop, saveRevision, setStopFavorite, touchItinerary, updateStopRow } from '../lib/db'
import { enforceRateLimit } from '../lib/rateLimit'
import { clientIp, error, json, nowIso } from '../lib/util'
import { arrivalDate } from '../../shared/schedule'
import { reconcileTransfers } from '../../shared/transfers'
import { validateFavorite, validateStop, validateTimelineTransfers } from '../lib/validate'

type AppEnv = { Bindings: Env }

export const stops = new Hono<AppEnv>()

stops.put('/:id/timeline-transfers', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) return error('Troppe modifiche. Riprova tra un minuto.', 429)
  const current = await getStop(c.env.DB, c.req.param('id'))
  if (!current) return error('Tappa non trovata', 404)
  const body = await c.req.json() as Record<string, unknown>
  const events = validateTimelineTransfers(body.timeline_transfers)
  if (typeof events === 'string') return error(events)
  const itinerary = await getItinerary(c.env.DB, current.itinerary_id)
  if (!itinerary) return error('Itinerario non trovato', 404)
  await saveRevision(c.env.DB, itinerary.id)
  const next = itinerary.stops.map((stop) => stop.id === current.id ? { ...stop, timeline_transfers: events } : stop)
  const ts = nowIso()
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE stops SET timeline_transfers = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(events), ts, current.id),
    c.env.DB.prepare('UPDATE itineraries SET end_date = ?, updated_at = ? WHERE id = ?').bind(arrivalDate(itinerary.start_date, next), ts, itinerary.id),
  ])
  return json(await getItinerary(c.env.DB, itinerary.id))
})

stops.put('/:id/move', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) return error('Troppe modifiche. Riprova tra un minuto.', 429)
  const current = await getStop(c.env.DB, c.req.param('id'))
  if (!current) return error('Tappa non trovata', 404)
  const body = await c.req.json() as { direction?: unknown }
  if (body.direction !== -1 && body.direction !== 1) return error('Direzione non valida')
  const itinerary = await getItinerary(c.env.DB, current.itinerary_id)
  if (!itinerary) return error('Itinerario non trovato', 404)
  const previous = itinerary.stops.map((stop) => ({ ...stop, key: stop.id }))
  const index = previous.findIndex((stop) => stop.id === current.id)
  const target = index + body.direction
  if (target < 0 || target >= previous.length) return error('La tappa è già all’inizio o alla fine')
  const reordered = [...previous]
  ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
  const next = reconcileTransfers(previous, reordered)
  await saveRevision(c.env.DB, itinerary.id)
  const ts = nowIso()
  await c.env.DB.batch([
    ...next.map((stop, position) => c.env.DB.prepare('UPDATE stops SET position = ?, transfer_minutes = ?, transfer_distance_km = ?, transfer_mode = ?, timeline_transfers = ?, updated_at = ? WHERE id = ? AND itinerary_id = ?')
      .bind(position + 1, stop.transfer_minutes, stop.transfer_distance_km, stop.transfer_mode, JSON.stringify(stop.timeline_transfers || []), ts, stop.id, itinerary.id)),
    c.env.DB.prepare('UPDATE itineraries SET end_date = ?, updated_at = ? WHERE id = ?').bind(arrivalDate(itinerary.start_date, next), ts, itinerary.id),
  ])
  return json(await getItinerary(c.env.DB, itinerary.id))
})

stops.put('/:id/transfer', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) return error('Troppe modifiche. Riprova tra un minuto.', 429)
  const current = await getStop(c.env.DB, c.req.param('id'))
  if (!current) return error('Tappa non trovata', 404)
  const body = await c.req.json() as Record<string, unknown>
  const parsed = validateStop({ ...current, transfer_minutes: body.transfer_minutes, transfer_distance_km: body.transfer_distance_km, transfer_mode: body.transfer_mode })
  if (typeof parsed === 'string') return error(parsed)
  await saveRevision(c.env.DB, current.itinerary_id)
  await c.env.DB.prepare('UPDATE stops SET transfer_minutes = ?, transfer_distance_km = ?, transfer_mode = ?, updated_at = ? WHERE id = ?')
    .bind(parsed.transfer_minutes ?? null, parsed.transfer_distance_km ?? null, parsed.transfer_mode || '', nowIso(), current.id).run()
  await touchItinerary(c.env.DB, current.itinerary_id)
  return json(await getStop(c.env.DB, current.id))
})

stops.put('/:id/nights', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) return error('Troppe modifiche. Riprova tra un minuto.', 429)
  const current = await getStop(c.env.DB, c.req.param('id'))
  if (!current) return error('Tappa non trovata', 404)
  const body = await c.req.json() as { nights?: unknown }
  if (typeof body.nights !== 'number' || !Number.isInteger(body.nights) || body.nights < 1 || body.nights > 30) return error('Le notti devono essere tra 1 e 30')
  const itinerary = await getItinerary(c.env.DB, current.itinerary_id)
  if (!itinerary) return error('Itinerario non trovato', 404)
  await saveRevision(c.env.DB, itinerary.id)
  const nextStops = itinerary.stops.map((stop) => stop.id === current.id ? { ...stop, nights: body.nights as number } : stop)
  const ts = nowIso()
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE stops SET nights = ?, updated_at = ? WHERE id = ?').bind(body.nights, ts, current.id),
    c.env.DB.prepare('UPDATE itineraries SET end_date = ?, updated_at = ? WHERE id = ?').bind(arrivalDate(itinerary.start_date, nextStops), ts, itinerary.id),
  ])
  return json(await getItinerary(c.env.DB, itinerary.id))
})

stops.put('/:id', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) {
    return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const id = c.req.param('id')
  const current = await getStop(c.env.DB, id)
  if (!current) return error('Tappa non trovata', 404)
  const parsed = validateStop(await c.req.json())
  if (typeof parsed === 'string') return error(parsed)
  await saveRevision(c.env.DB, current.itinerary_id)
  await updateStopRow(c.env.DB, id, parsed)
  await touchItinerary(c.env.DB, current.itinerary_id)
  return json(await getStop(c.env.DB, id))
})

stops.post('/:id/favorite', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) {
    return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const id = c.req.param('id')
  const current = await getStop(c.env.DB, id)
  if (!current) return error('Tappa non trovata', 404)
  const parsed = validateFavorite(await c.req.json())
  if (typeof parsed === 'string') return error(parsed)
  await saveRevision(c.env.DB, current.itinerary_id)
  if (parsed.kind === 'image') await setStopFavorite(c.env.DB, id, { image_url: parsed.url })
  else await setStopFavorite(c.env.DB, id, { video_url: parsed.url })
  await touchItinerary(c.env.DB, current.itinerary_id)
  return json(await getStop(c.env.DB, id))
})

stops.delete('/:id', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) {
    return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const current = await getStop(c.env.DB, c.req.param('id'))
  if (!current) return error('Tappa non trovata', 404)
  await saveRevision(c.env.DB, current.itinerary_id)
  await deleteStopCascade(c.env.DB, current.id)
  await touchItinerary(c.env.DB, current.itinerary_id)
  return json({ ok: true })
})
