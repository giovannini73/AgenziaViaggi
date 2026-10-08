import type { CommentItem, ItineraryDetail, ItineraryInput, ItineraryListItem, Stop, StopInput, StopNoteItem, UserVote } from '../../shared/types'
import { fillVotes } from '../../shared/types'
import { addDays, arrivalDate } from '../../shared/schedule'
import { SEED_ITINERARIES } from '../seed'
import { nowIso, parseTags, slugify } from './util'

type ItineraryRow = {
  id: string
  title: string
  slug: string
  description: string
  country: string
  start_city: string
  end_city: string
  start_date: string | null
  end_date: string | null
  travel_style: string
  cover_image: string | null
  tags: string
  recommended_period: string
  created_at: string
  updated_at: string
  stop_count?: number
  duration_nights?: number
  avg_rating?: number | null
  rating_count?: number
}

type StopRow = {
  id: string
  itinerary_id: string
  position: number
  name: string
  country: string
  latitude: number | null
  longitude: number | null
  arrival_day: string
  nights: number
  description: string
  why_visit: string
  attractions: string
  food_notes: string
  markets: string
  where_to_eat: string
  where_to_stay: string
  beaches: string
  excursions: string
  transfer_minutes: number | null
  transfer_distance_km: number | null
  transfer_mode: string
  image_url: string | null
  video_url: string | null
  avg_rating?: number | null
  rating_count?: number
}

function mapList(row: ItineraryRow): ItineraryListItem {
  const nights = Number(row.duration_nights || 0)
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    country: row.country,
    start_city: row.start_city,
    end_city: row.end_city,
    start_date: row.start_date,
    end_date: Number(row.stop_count || 0) > 0 ? addDays(row.start_date, nights) : null,
    travel_style: row.travel_style,
    cover_image: row.cover_image,
    tags: parseTags(row.tags),
    recommended_period: row.recommended_period,
    duration_nights: nights,
    duration_days: Number(row.stop_count || 0) > 0 ? nights + 1 : 0,
    stop_count: Number(row.stop_count || 0),
    avg_rating: row.avg_rating == null ? null : Number(row.avg_rating),
    rating_count: Number(row.rating_count || 0),
    votes: fillVotes([]),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapStop(row: StopRow): Stop {
  return {
    id: row.id,
    itinerary_id: row.itinerary_id,
    position: row.position,
    name: row.name,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    arrival_day: row.arrival_day,
    nights: row.nights,
    description: row.description,
    why_visit: row.why_visit,
    attractions: row.attractions,
    food_notes: row.food_notes,
    markets: row.markets,
    where_to_eat: row.where_to_eat,
    where_to_stay: row.where_to_stay,
    beaches: row.beaches,
    excursions: row.excursions,
    transfer_minutes: row.transfer_minutes,
    transfer_distance_km: row.transfer_distance_km,
    transfer_mode: row.transfer_mode,
    image_url: row.image_url,
    video_url: row.video_url ?? null,
    avg_rating: row.avg_rating == null ? null : Number(row.avg_rating),
    rating_count: Number(row.rating_count || 0),
    votes: fillVotes([]),
    notes: [],
  }
}

const LIST_SELECT = `
  SELECT i.*,
    (SELECT COUNT(*) FROM stops s WHERE s.itinerary_id = i.id) AS stop_count,
    (SELECT COALESCE(SUM(nights), 0) FROM stops s WHERE s.itinerary_id = i.id) AS duration_nights,
    (SELECT AVG(rating) FROM itinerary_ratings r WHERE r.itinerary_id = i.id AND r.user_id IN ('sabrina', 'claudio')) AS avg_rating,
    (SELECT COUNT(*) FROM itinerary_ratings r WHERE r.itinerary_id = i.id AND r.user_id IN ('sabrina', 'claudio')) AS rating_count
  FROM itineraries i
`

const STOP_SELECT = `
  SELECT s.*,
    (SELECT AVG(rating) FROM stop_ratings r WHERE r.stop_id = s.id AND r.user_id IN ('sabrina', 'claudio')) AS avg_rating,
    (SELECT COUNT(*) FROM stop_ratings r WHERE r.stop_id = s.id AND r.user_id IN ('sabrina', 'claudio')) AS rating_count
  FROM stops s
`

export async function ensureSeed(db: D1Database): Promise<void> {
  const row = await db.prepare('SELECT COUNT(*) AS c FROM itineraries').first<{ c: number }>()
  if (row && Number(row.c) > 0) return
  const ts = nowIso()
  for (const item of SEED_ITINERARIES) {
    await db
      .prepare(
        `INSERT INTO itineraries (id, title, slug, description, country, start_city, end_city, start_date, end_date, travel_style, cover_image, tags, recommended_period, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        item.id,
        item.title,
        item.slug,
        item.description,
        item.country,
        item.start_city,
        item.end_city,
        item.start_date,
        item.end_date,
        item.travel_style,
        item.cover_image,
        JSON.stringify(item.tags),
        item.recommended_period,
        ts,
        ts,
      )
      .run()
    for (const [index, s] of item.stops.entries()) {
      await db
        .prepare(
          `INSERT INTO stops (id, itinerary_id, position, name, country, latitude, longitude, arrival_day, nights, description, why_visit, attractions, food_notes, markets, where_to_eat, where_to_stay, beaches, excursions, transfer_minutes, transfer_distance_km, transfer_mode, image_url, video_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          `${item.id}-${String(index + 1).padStart(2, '0')}`,
          item.id,
          index + 1,
          s.name,
          s.country,
          s.latitude,
          s.longitude,
          s.arrival_day,
          s.nights,
          s.description,
          s.why_visit,
          s.attractions,
          s.food_notes,
          s.markets,
          s.where_to_eat,
          s.where_to_stay,
          s.beaches,
          s.excursions,
          s.transfer_minutes,
          s.transfer_distance_km,
          s.transfer_mode,
          s.image_url,
          null,
          ts,
          ts,
        )
        .run()
    }
  }
}

export async function listItineraries(db: D1Database): Promise<ItineraryListItem[]> {
  const { results } = await db.prepare(`${LIST_SELECT} ORDER BY i.updated_at DESC`).all<ItineraryRow>()
  const items = (results || []).map(mapList)
  await attachItineraryVotes(db, items)
  return items
}

export async function getItinerary(db: D1Database, id: string): Promise<ItineraryDetail | null> {
  const row = await db.prepare(`${LIST_SELECT} WHERE i.id = ?`).bind(id).first<ItineraryRow>()
  if (!row) return null
  const stops = await listStops(db, id)
  const comments = await listItineraryComments(db, id)
  const item = { ...mapList(row), stops, comments }
  await attachItineraryVotes(db, [item])
  return item
}

export async function listStops(db: D1Database, itineraryId: string): Promise<Stop[]> {
  const { results } = await db
    .prepare(`${STOP_SELECT} WHERE s.itinerary_id = ? ORDER BY s.position ASC`)
    .bind(itineraryId)
    .all<StopRow>()
  const stops = (results || []).map(mapStop)
  await attachStopVotes(db, stops)
  await attachStopNotes(db, stops)
  for (const stop of stops) {
    stop.comments = await listStopComments(db, stop.id)
  }
  return stops
}

export async function getStop(db: D1Database, id: string): Promise<Stop | null> {
  const row = await db.prepare(`${STOP_SELECT} WHERE s.id = ?`).bind(id).first<StopRow>()
  if (!row) return null
  const stop = mapStop(row)
  await attachStopVotes(db, [stop])
  await attachStopNotes(db, [stop])
  stop.comments = await listStopComments(db, id)
  return stop
}

type NamedRatingRow = { user_id: string; rating?: number | null; seen?: boolean }

async function attachItineraryVotes(db: D1Database, items: { id: string; votes: UserVote[] }[]): Promise<void> {
  if (!items.length) return
  const { results } = await db
    .prepare(
      `SELECT itinerary_id, user_id, rating FROM itinerary_ratings WHERE user_id IN ('sabrina', 'claudio')`,
    )
    .all<{ itinerary_id: string } & NamedRatingRow>()
  const byId = new Map<string, NamedRatingRow[]>()
  for (const row of results || []) {
    const list = byId.get(row.itinerary_id) || []
    list.push(row)
    byId.set(row.itinerary_id, list)
  }
  for (const item of items) item.votes = fillVotes(byId.get(item.id) || [])
}

async function attachStopVotes(db: D1Database, stops: Stop[]): Promise<void> {
  if (!stops.length) return
  const { results: ratings } = await db
    .prepare(`SELECT stop_id, user_id, rating FROM stop_ratings WHERE user_id IN ('sabrina', 'claudio')`)
    .all<{ stop_id: string; user_id: string; rating: number }>()
  const { results: seenRows } = await db
    .prepare(`SELECT stop_id, user_id FROM stop_seen WHERE user_id IN ('sabrina', 'claudio') AND seen = 1`)
    .all<{ stop_id: string; user_id: string }>()
  const byId = new Map<string, NamedRatingRow[]>()
  for (const row of ratings || []) {
    const list = byId.get(row.stop_id) || []
    list.push({ user_id: row.user_id, rating: row.rating, seen: false })
    byId.set(row.stop_id, list)
  }
  for (const row of seenRows || []) {
    const list = byId.get(row.stop_id) || []
    const existing = list.find((item) => item.user_id === row.user_id)
    if (existing) existing.seen = true
    else list.push({ user_id: row.user_id, rating: null, seen: true })
    byId.set(row.stop_id, list)
  }
  for (const stop of stops) stop.votes = fillVotes(byId.get(stop.id) || [])
}

async function attachStopNotes(db: D1Database, stops: Stop[]): Promise<void> {
  if (!stops.length) return
  const placeholders = stops.map(() => '?').join(',')
  const { results } = await db
    .prepare(
      `SELECT id, stop_id, user_id, author_name, body, video_id, created_at
       FROM stop_notes WHERE stop_id IN (${placeholders})
       ORDER BY created_at DESC`,
    )
    .bind(...stops.map((stop) => stop.id))
    .all<StopNoteItem>()
  const byId = new Map<string, StopNoteItem[]>()
  for (const row of results || []) {
    const list = byId.get(row.stop_id) || []
    list.push(row)
    byId.set(row.stop_id, list)
  }
  for (const stop of stops) stop.notes = byId.get(stop.id) || []
}

export async function listStopNotes(db: D1Database, stopId: string): Promise<StopNoteItem[]> {
  const { results } = await db
    .prepare(
      `SELECT id, stop_id, user_id, author_name, body, video_id, created_at
       FROM stop_notes WHERE stop_id = ? ORDER BY created_at DESC`,
    )
    .bind(stopId)
    .all<StopNoteItem>()
  return results || []
}

export async function insertStopNote(
  db: D1Database,
  stopId: string,
  userId: string,
  authorName: string,
  body: string,
  videoId: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO stop_notes (id, stop_id, user_id, author_name, body, video_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), stopId, userId, authorName, body, videoId, nowIso())
    .run()
}

export async function getStopNote(
  db: D1Database,
  id: string,
): Promise<{ id: string; stop_id: string; user_id: string } | null> {
  return (
    (await db
      .prepare('SELECT id, stop_id, user_id FROM stop_notes WHERE id = ?')
      .bind(id)
      .first<{ id: string; stop_id: string; user_id: string }>()) || null
  )
}

export async function deleteStopNote(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM stop_notes WHERE id = ?').bind(id).run()
}

export async function upsertItineraryRating(
  db: D1Database,
  itineraryId: string,
  userId: string,
  rating: number,
): Promise<void> {
  const existing = await db
    .prepare('SELECT id FROM itinerary_ratings WHERE itinerary_id = ? AND user_id = ?')
    .bind(itineraryId, userId)
    .first<{ id: string }>()
  if (existing) {
    await db.prepare('UPDATE itinerary_ratings SET rating = ? WHERE id = ?').bind(rating, existing.id).run()
    return
  }
  await db
    .prepare('INSERT INTO itinerary_ratings (id, itinerary_id, user_id, rating, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), itineraryId, userId, rating, nowIso())
    .run()
}

export async function upsertStopRating(db: D1Database, stopId: string, userId: string, rating: number): Promise<void> {
  const existing = await db
    .prepare('SELECT id FROM stop_ratings WHERE stop_id = ? AND user_id = ?')
    .bind(stopId, userId)
    .first<{ id: string }>()
  if (existing) {
    await db.prepare('UPDATE stop_ratings SET rating = ? WHERE id = ?').bind(rating, existing.id).run()
    return
  }
  await db
    .prepare('INSERT INTO stop_ratings (id, stop_id, user_id, rating, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), stopId, userId, rating, nowIso())
    .run()
}

export async function upsertStopSeen(db: D1Database, stopId: string, userId: string, seen: boolean): Promise<void> {
  if (!seen) {
    await db.prepare('DELETE FROM stop_seen WHERE stop_id = ? AND user_id = ?').bind(stopId, userId).run()
    return
  }
  await db
    .prepare(
      `INSERT INTO stop_seen (stop_id, user_id, seen, updated_at) VALUES (?, ?, 1, ?)
       ON CONFLICT(stop_id, user_id) DO UPDATE SET seen = 1, updated_at = excluded.updated_at`,
    )
    .bind(stopId, userId, nowIso())
    .run()
}

export async function listItineraryComments(db: D1Database, itineraryId: string): Promise<CommentItem[]> {
  const { results } = await db
    .prepare(
      'SELECT id, author_name, comment, rating, created_at FROM itinerary_comments WHERE itinerary_id = ? ORDER BY created_at DESC',
    )
    .bind(itineraryId)
    .all<CommentItem>()
  return results || []
}

export async function listStopComments(db: D1Database, stopId: string): Promise<CommentItem[]> {
  const { results } = await db
    .prepare(
      'SELECT id, author_name, comment, rating, created_at FROM stop_comments WHERE stop_id = ? ORDER BY created_at DESC',
    )
    .bind(stopId)
    .all<CommentItem>()
  return results || []
}

export async function insertStop(db: D1Database, itineraryId: string, position: number, s: StopInput): Promise<string> {
  const id = crypto.randomUUID()
  const ts = nowIso()
  await db
    .prepare(
      `INSERT INTO stops (id, itinerary_id, position, name, country, latitude, longitude, arrival_day, nights, description, why_visit, attractions, food_notes, markets, where_to_eat, where_to_stay, beaches, excursions, transfer_minutes, transfer_distance_km, transfer_mode, image_url, video_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      itineraryId,
      position,
      s.name,
      s.country || '',
      s.latitude ?? null,
      s.longitude ?? null,
      s.arrival_day || '',
      s.nights ?? 0,
      s.description || '',
      s.why_visit || '',
      s.attractions || '',
      s.food_notes || '',
      s.markets || '',
      s.where_to_eat || '',
      s.where_to_stay || '',
      s.beaches || '',
      s.excursions || '',
      s.transfer_minutes ?? null,
      s.transfer_distance_km ?? null,
      s.transfer_mode || '',
      s.image_url ?? null,
      s.video_url ?? null,
      ts,
      ts,
    )
    .run()
  return id
}

export async function updateStopRow(db: D1Database, id: string, s: StopInput, position?: number): Promise<void> {
  const current = await db.prepare('SELECT * FROM stops WHERE id = ?').bind(id).first<StopRow>()
  if (!current) return
  const ts = nowIso()
  await db
    .prepare(
      `UPDATE stops SET position = ?, name = ?, country = ?, latitude = ?, longitude = ?, arrival_day = ?, nights = ?, description = ?, why_visit = ?, attractions = ?, food_notes = ?, markets = ?, where_to_eat = ?, where_to_stay = ?, beaches = ?, excursions = ?, transfer_minutes = ?, transfer_distance_km = ?, transfer_mode = ?, image_url = ?, video_url = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      position ?? current.position,
      s.name,
      s.country ?? current.country,
      s.latitude ?? null,
      s.longitude ?? null,
      s.arrival_day ?? current.arrival_day,
      s.nights ?? current.nights,
      s.description ?? current.description,
      s.why_visit ?? current.why_visit,
      s.attractions ?? current.attractions,
      s.food_notes ?? current.food_notes,
      s.markets ?? current.markets,
      s.where_to_eat ?? current.where_to_eat,
      s.where_to_stay ?? current.where_to_stay,
      s.beaches ?? current.beaches,
      s.excursions ?? current.excursions,
      s.transfer_minutes ?? null,
      s.transfer_distance_km ?? null,
      s.transfer_mode ?? current.transfer_mode,
      s.image_url !== undefined ? s.image_url ?? null : current.image_url,
      s.video_url !== undefined ? s.video_url ?? null : current.video_url,
      ts,
      id,
    )
    .run()
}

export async function setStopFavorite(
  db: D1Database,
  id: string,
  patch: { image_url?: string | null; video_url?: string | null },
): Promise<void> {
  const ts = nowIso()
  if ('image_url' in patch) {
    await db.prepare('UPDATE stops SET image_url = ?, updated_at = ? WHERE id = ?').bind(patch.image_url, ts, id).run()
  }
  if ('video_url' in patch) {
    await db.prepare('UPDATE stops SET video_url = ?, updated_at = ? WHERE id = ?').bind(patch.video_url, ts, id).run()
  }
}

export async function deleteStopCascade(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM stop_comments WHERE stop_id = ?').bind(id).run()
  await db.prepare('DELETE FROM stop_ratings WHERE stop_id = ?').bind(id).run()
  await db.prepare('DELETE FROM stop_seen WHERE stop_id = ?').bind(id).run()
  await db.prepare('DELETE FROM stop_notes WHERE stop_id = ?').bind(id).run()
  await db.prepare('DELETE FROM stops WHERE id = ?').bind(id).run()
}

export async function saveRevision(db: D1Database, itineraryId: string): Promise<void> {
  const snapshot = await getItinerary(db, itineraryId)
  if (!snapshot) return
  await db
    .prepare('INSERT INTO itinerary_revisions (id, itinerary_id, snapshot_json, created_at) VALUES (?, ?, ?, ?)')
    .bind(crypto.randomUUID(), itineraryId, JSON.stringify(snapshot), nowIso())
    .run()
  const old = await db
    .prepare(
      'SELECT id FROM itinerary_revisions WHERE itinerary_id = ? ORDER BY created_at DESC',
    )
    .bind(itineraryId)
    .all<{ id: string }>()
  const extra = (old.results || []).slice(20)
  for (const row of extra) {
    await db.prepare('DELETE FROM itinerary_revisions WHERE id = ?').bind(row.id).run()
  }
}

export async function replaceStops(db: D1Database, itineraryId: string, stops: StopInput[]): Promise<void> {
  const existing = await db
    .prepare('SELECT id FROM stops WHERE itinerary_id = ?')
    .bind(itineraryId)
    .all<{ id: string }>()
  const keep = new Set(stops.map((s) => s.id).filter(Boolean) as string[])
  for (const row of existing.results || []) {
    if (!keep.has(row.id)) await deleteStopCascade(db, row.id)
  }
  for (const [index, s] of stops.entries()) {
    if (s.id && keep.has(s.id) && (existing.results || []).some((r) => r.id === s.id)) {
      await updateStopRow(db, s.id, s, index + 1)
    } else {
      await insertStop(db, itineraryId, index + 1, s)
    }
  }
}

export async function touchItinerary(db: D1Database, id: string): Promise<void> {
  await db.prepare('UPDATE itineraries SET updated_at = ? WHERE id = ?').bind(nowIso(), id).run()
}

export function matchStopsByName(existing: { id: string; name: string }[], incoming: StopInput[]): StopInput[] {
  const used = new Set<string>()
  return incoming.map((stop) => {
    const found = existing.find(
      (row) => !used.has(row.id) && row.name.trim().toLowerCase() === stop.name.trim().toLowerCase(),
    )
    if (!found) return stop
    used.add(found.id)
    return { ...stop, id: found.id }
  })
}

export async function insertItinerary(db: D1Database, parsed: ItineraryInput): Promise<string> {
  const id = crypto.randomUUID()
  const ts = nowIso()
  await db
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
      parsed.start_date ?? null,
      arrivalDate(parsed.start_date, parsed.stops || []),
      parsed.travel_style || '',
      parsed.cover_image ?? null,
      JSON.stringify(parsed.tags || []),
      parsed.recommended_period || '',
      ts,
      ts,
    )
    .run()
  if (parsed.stops?.length) await replaceStops(db, id, parsed.stops)
  return id
}

export async function updateItineraryFields(db: D1Database, id: string, parsed: ItineraryInput): Promise<void> {
  await db
    .prepare(
      `UPDATE itineraries SET title = ?, description = ?, country = ?, start_city = ?, end_city = ?, start_date = ?, end_date = ?, travel_style = ?, cover_image = ?, tags = ?, recommended_period = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      parsed.title,
      parsed.description || '',
      parsed.country || '',
      parsed.start_city || '',
      parsed.end_city || '',
      parsed.start_date ?? null,
      arrivalDate(parsed.start_date, parsed.stops || []),
      parsed.travel_style || '',
      parsed.cover_image ?? null,
      JSON.stringify(parsed.tags || []),
      parsed.recommended_period || '',
      nowIso(),
      id,
    )
    .run()
  if (parsed.stops) await replaceStops(db, id, parsed.stops)
}

export async function deleteItineraryCascade(db: D1Database, id: string, stopIds: string[]): Promise<void> {
  const conversations = await db
    .prepare('SELECT id FROM conversations WHERE itinerary_id = ?')
    .bind(id)
    .all<{ id: string }>()
  for (const row of conversations.results || []) {
    await db.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(row.id).run()
  }
  await db.prepare('DELETE FROM conversations WHERE itinerary_id = ?').bind(id).run()
  await db.prepare('DELETE FROM itinerary_revisions WHERE itinerary_id = ?').bind(id).run()
  for (const stopId of stopIds) {
    await db.prepare('DELETE FROM stop_comments WHERE stop_id = ?').bind(stopId).run()
    await db.prepare('DELETE FROM stop_ratings WHERE stop_id = ?').bind(stopId).run()
    await db.prepare('DELETE FROM stop_seen WHERE stop_id = ?').bind(stopId).run()
    await db.prepare('DELETE FROM stop_notes WHERE stop_id = ?').bind(stopId).run()
  }
  await db.prepare('DELETE FROM stops WHERE itinerary_id = ?').bind(id).run()
  await db.prepare('DELETE FROM itinerary_comments WHERE itinerary_id = ?').bind(id).run()
  await db.prepare('DELETE FROM itinerary_ratings WHERE itinerary_id = ?').bind(id).run()
  await db.prepare('DELETE FROM itineraries WHERE id = ?').bind(id).run()
}
