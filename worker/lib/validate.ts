import type { ItineraryInput, StopInput } from '../../shared/types'
import { arrivalDate, isDateOnly } from '../../shared/schedule'
import { asString, clampInt, parseTags } from './util'
import { youtubeIdFromUrl, youtubeWatchUrl } from './youtube'

const URL_RE = /^https?:\/\/[^\s]+$/i

export function validateRating(value: unknown): number | null {
  const n = clampInt(value, 0, 5)
  return n
}

export function validateComment(body: unknown): { author_name: string; comment: string; rating: number | null } | string {
  if (!body || typeof body !== 'object') return 'Dati non validi'
  const rec = body as Record<string, unknown>
  const comment = asString(rec.comment, 2000)
  if (comment.length < 3) return 'Il commento è obbligatorio (almeno 3 caratteri)'
  const author_name = asString(rec.author_name, 80)
  const rating = rec.rating == null || rec.rating === '' ? null : validateRating(rec.rating)
  if (rec.rating != null && rec.rating !== '' && rating == null) return 'Il voto deve essere tra 0 e 5'
  return { author_name, comment, rating }
}

export function validateNote(body: unknown): { body: string; video_id: string | null } | string {
  if (!body || typeof body !== 'object') return 'Dati non validi'
  const rec = body as Record<string, unknown>
  const text = asString(rec.body, 2000)
  if (!text) return 'Scrivi una nota'
  let video_id: string | null = null
  const raw = asString(rec.video_id, 80)
  if (raw) {
    video_id = /^[a-zA-Z0-9_-]{11}$/.test(raw) ? raw : youtubeIdFromUrl(raw)
    if (!video_id) return 'Video non valido'
  }
  return { body: text, video_id }
}

function optUrl(value: unknown): string | null {
  const s = asString(value, 500)
  if (!s) return null
  if (!URL_RE.test(s)) return null
  return s
}

export function validateStop(body: unknown): StopInput | string {
  if (!body || typeof body !== 'object') return 'Tappa non valida'
  const rec = body as Record<string, unknown>
  const name = asString(rec.name, 120)
  if (!name) return 'Ogni tappa deve avere un nome'
  const nights = rec.nights == null || rec.nights === '' ? 0 : clampInt(rec.nights, 0, 30)
  if (nights == null) return 'Le notti devono essere tra 0 e 30'
  let latitude: number | null = null
  let longitude: number | null = null
  if (rec.latitude != null && rec.latitude !== '') {
    const lat = Number(rec.latitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'Latitudine non valida'
    latitude = lat
  }
  if (rec.longitude != null && rec.longitude !== '') {
    const lng = Number(rec.longitude)
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return 'Longitudine non valida'
    longitude = lng
  }
  let transfer_minutes: number | null = null
  if (rec.transfer_minutes != null && rec.transfer_minutes !== '') {
    transfer_minutes = clampInt(rec.transfer_minutes, 0, 72 * 60)
    if (transfer_minutes == null) return 'Tempo di trasferimento non valido'
  }
  let transfer_distance_km: number | null = null
  if (rec.transfer_distance_km != null && rec.transfer_distance_km !== '') {
    const km = Number(rec.transfer_distance_km)
    if (!Number.isFinite(km) || km < 0 || km > 20000) return 'Distanza non valida'
    transfer_distance_km = Math.round(km * 10) / 10
  }
  return {
    id: rec.id ? asString(rec.id, 80) : undefined,
    name,
    country: asString(rec.country, 80),
    latitude,
    longitude,
    arrival_day: asString(rec.arrival_day, 80),
    nights,
    description: asString(rec.description, 4000),
    why_visit: asString(rec.why_visit, 2000),
    attractions: asString(rec.attractions, 2000),
    food_notes: asString(rec.food_notes, 2000),
    markets: asString(rec.markets, 2000),
    where_to_eat: asString(rec.where_to_eat, 2000),
    where_to_stay: asString(rec.where_to_stay, 2000),
    beaches: asString(rec.beaches, 2000),
    excursions: asString(rec.excursions, 2000),
    transfer_minutes,
    transfer_distance_km,
    transfer_mode: asString(rec.transfer_mode, 40),
    image_url: optUrl(rec.image_url),
    video_url: optUrl(rec.video_url),
  }
}

export function validateFavorite(body: unknown): { kind: 'image' | 'video'; url: string | null } | string {
  if (!body || typeof body !== 'object') return 'Dati non validi'
  const rec = body as Record<string, unknown>
  const kind = asString(rec.kind, 10)
  if (kind !== 'image' && kind !== 'video') return 'Tipo non valido'
  if (rec.url == null || rec.url === '') return { kind, url: null }
  const url = optUrl(rec.url)
  if (!url) return 'Indirizzo non valido'
  if (kind === 'video' && !youtubeIdFromUrl(url)) return 'Il video deve essere un indirizzo YouTube'
  return { kind, url: kind === 'video' ? youtubeWatchUrl(youtubeIdFromUrl(url)!) : url }
}

export function validateItinerary(body: unknown, partial = false): ItineraryInput | string {
  if (!body || typeof body !== 'object') return 'Dati non validi'
  const rec = body as Record<string, unknown>
  const title = asString(rec.title, 160)
  if (!partial && !title) return 'Il titolo è obbligatorio'
  if (partial && rec.title != null && !title) return 'Il titolo non può essere vuoto'
  const stopsRaw = rec.stops
  let stops: StopInput[] | undefined
  if (Array.isArray(stopsRaw)) {
    if (stopsRaw.length > 40) return 'Massimo 40 tappe'
    stops = []
    for (const item of stopsRaw) {
      const parsed = validateStop(item)
      if (typeof parsed === 'string') return parsed
      stops.push(parsed)
    }
  }
  const result: ItineraryInput = { title: title || '', stops }
  const take = (key: string) => !partial || Object.prototype.hasOwnProperty.call(rec, key)
  if (take('description')) result.description = asString(rec.description, 8000)
  if (take('country')) result.country = asString(rec.country, 120)
  if (take('start_city')) result.start_city = asString(rec.start_city, 80)
  if (take('end_city')) result.end_city = asString(rec.end_city, 80)
  if (take('start_date')) result.start_date = rec.start_date ? asString(rec.start_date, 20) : null
  if (take('end_date')) result.end_date = rec.end_date ? asString(rec.end_date, 20) : null
  if (result.start_date && !isDateOnly(result.start_date)) return 'Data di partenza non valida'
  if (!partial) result.end_date = arrivalDate(result.start_date, stops || [])
  if (take('travel_style')) result.travel_style = asString(rec.travel_style, 80)
  if (take('cover_image')) result.cover_image = optUrl(rec.cover_image)
  if (take('tags')) result.tags = parseTags(rec.tags)
  if (take('recommended_period')) result.recommended_period = asString(rec.recommended_period, 80)
  return result
}
