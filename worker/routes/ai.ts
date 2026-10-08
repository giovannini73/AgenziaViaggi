import { Hono } from 'hono'
import type { AiChatResponse, AiLink, AiProposal, ItineraryDetail, ItineraryInput } from '../../shared/types'
import {
  getItinerary,
  insertItinerary,
  matchStopsByName,
  saveRevision,
  updateItineraryFields,
} from '../lib/db'
import { resolveAiLink } from '../lib/mediaLinks'
import { enforceRateLimit } from '../lib/rateLimit'
import { asString, clientIp, error, json, nowIso } from '../lib/util'
import { validateItinerary } from '../lib/validate'
import { SYSTEM_PROMPT, createStructuredResponse } from '../openai'

type AppEnv = { Bindings: Env }

export const ai = new Hono<AppEnv>()

const MAX_PROMPT = 4000

function compactItinerary(item: ItineraryDetail) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    country: item.country,
    start_city: item.start_city,
    end_city: item.end_city,
    start_date: item.start_date,
    end_date: item.end_date,
    travel_style: item.travel_style,
    recommended_period: item.recommended_period,
    tags: item.tags,
    stops: item.stops.map((s) => ({
      name: s.name,
      country: s.country,
      nights: s.nights,
      latitude: s.latitude,
      longitude: s.longitude,
      arrival_day: s.arrival_day,
      description: s.description,
      why_visit: s.why_visit,
      attractions: s.attractions,
      food_notes: s.food_notes,
      markets: s.markets,
      where_to_eat: s.where_to_eat,
      where_to_stay: s.where_to_stay,
      beaches: s.beaches,
      excursions: s.excursions,
      transfer_minutes: s.transfer_minutes,
      transfer_distance_km: s.transfer_distance_km,
      transfer_mode: s.transfer_mode,
    })),
  }
}

function parseRawProposal(raw: unknown, locale: string): AiProposal | string {
  if (!raw || typeof raw !== 'object') return 'Risposta non valida'
  const rec = raw as Record<string, unknown>
  const action = rec.action
  if (action !== 'reply' && action !== 'update_itinerary' && action !== 'create_itinerary') {
    return 'Azione non riconosciuta'
  }
  const links: AiLink[] = []
  if (Array.isArray(rec.links)) {
    for (const item of rec.links.slice(0, 12)) {
      if (!item || typeof item !== 'object') continue
      const row = item as Record<string, unknown>
      const resolved = resolveAiLink(
        asString(row.kind, 20),
        asString(row.query, 160),
        asString(row.url, 500),
        locale,
      )
      if (resolved) links.push({ ...resolved, label: asString(row.label, 80) || resolved.label })
    }
  }
  let itinerary: ItineraryInput | null = null
  if (action !== 'reply') {
    const parsed = validateItinerary(rec.itinerary)
    if (typeof parsed === 'string') return parsed
    if (!parsed.stops?.length) return 'L’itinerario proposto non ha tappe'
    itinerary = parsed
  }
  return {
    action,
    message: asString(rec.message, 4000) || 'Ecco la mia proposta.',
    summary: asString(rec.summary, 400),
    changes: Array.isArray(rec.changes)
      ? rec.changes.map((c) => asString(c, 240)).filter(Boolean).slice(0, 20)
      : [],
    links,
    itinerary,
  }
}

async function requireKey(env: Env): Promise<string | Response> {
  const key = env.OPENAI_API_KEY?.trim()
  if (!key) return error('La chat non è ancora collegata. Chi gestisce il sito deve attivarla.', 503)
  return key
}

async function loadHistory(db: D1Database, conversationId: string) {
  const { results } = await db
    .prepare(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    )
    .bind(conversationId)
    .all<{ role: string; content: string }>()
  return (results || []).slice(-12).map((m) => ({
    role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: m.content.slice(0, MAX_PROMPT),
  }))
}

async function ensureConversation(db: D1Database, conversationId: string | null, itineraryId: string | null) {
  if (conversationId) {
    const row = await db.prepare('SELECT id FROM conversations WHERE id = ?').bind(conversationId).first()
    if (row) return conversationId
  }
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO conversations (id, itinerary_id, created_at) VALUES (?, ?, ?)')
    .bind(id, itineraryId, nowIso())
    .run()
  return id
}

async function saveMessage(db: D1Database, conversationId: string, role: string, content: string) {
  await db
    .prepare('INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), conversationId, role, content.slice(0, 8000), nowIso())
    .run()
}

async function runModel(env: Env, input: { role: 'user' | 'assistant'; content: string }[], extra: string) {
  const key = env.OPENAI_API_KEY!.trim()
  const model = env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini'
  const text = await createStructuredResponse({
    apiKey: key,
    model,
    instructions: `${SYSTEM_PROMPT}\n\n${extra}`,
    input,
  })
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new Error('La risposta non era in un formato utilizzabile')
  }
  return parsed
}

ai.post('/chat', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'ai'))) {
    return error('Troppe richieste alla chat da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const key = await requireKey(c.env)
  if (key instanceof Response) return key
  const body = (await c.req.json()) as Record<string, unknown>
  const message = asString(body.message, MAX_PROMPT)
  if (message.length < 2) return error('Scrivi un messaggio più lungo')
  const locale = asString(body.locale, 16) || 'it'
  const itineraryId = body.itinerary_id ? asString(body.itinerary_id, 80) : null
  const conversationId = await ensureConversation(
    c.env.DB,
    body.conversation_id ? asString(body.conversation_id, 80) : null,
    itineraryId,
  )
  const current = itineraryId ? await getItinerary(c.env.DB, itineraryId) : null
  if (itineraryId && !current) return error('Itinerario non trovato', 404)
  const history = await loadHistory(c.env.DB, conversationId)
  const extra = [
    `Lingua del browser: ${locale}`,
    current
      ? `Itinerario attualmente aperto (id ${current.id}):\n${JSON.stringify(compactItinerary(current))}`
      : 'Nessun itinerario aperto. Se l’utente descrive un viaggio nuovo usa create_itinerary.',
  ].join('\n\n')
  let raw: unknown
  try {
    raw = await runModel(c.env, [...history, { role: 'user', content: message }], extra)
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Chat non disponibile', 502)
  }
  const proposal = parseRawProposal(raw, locale)
  if (typeof proposal === 'string') return error(proposal)
  await saveMessage(c.env.DB, conversationId, 'user', message)
  await saveMessage(c.env.DB, conversationId, 'assistant', proposal.message)
  return json({ conversation_id: conversationId, proposal } satisfies AiChatResponse)
})

ai.post('/create-itinerary', async (c) => {
  const body = (await c.req.json()) as Record<string, unknown>
  if (body.apply === true) {
    if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) {
      return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
    }
    const parsed = validateItinerary(body.itinerary)
    if (typeof parsed === 'string') return error(parsed)
    const id = await insertItinerary(c.env.DB, parsed)
    return json(await getItinerary(c.env.DB, id), 201)
  }
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'ai'))) {
    return error('Troppe richieste alla chat da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const key = await requireKey(c.env)
  if (key instanceof Response) return key
  const locale = asString(body.locale, 16) || 'it'
  const prefs = Array.isArray(body.preferences)
    ? body.preferences.map((p) => asString(p, 40)).filter(Boolean)
    : []
  const prompt = [
    `Paese / area: ${asString(body.country, 120)}`,
    `Partenza: ${asString(body.start_city, 80)}`,
    `Arrivo: ${asString(body.end_city, 80)}`,
    `Data partenza: ${asString(body.start_date, 20)}`,
    `Data ritorno: ${asString(body.end_date, 20)}`,
    `Ritmo: ${asString(body.rhythm, 80)}`,
    `Priorità: ${asString(body.priorities, 200)}`,
    `Budget: ${asString(body.budget, 80)}`,
    `Preferenze: ${prefs.join(', ')}`,
    `Richiesta libera: ${asString(body.prompt, MAX_PROMPT)}`,
  ].join('\n')
  if (prompt.replace(/\s/g, '').length < 12) return error('Descrivi almeno il viaggio che vuoi')
  let raw: unknown
  try {
    raw = await runModel(
      c.env,
      [{ role: 'user', content: `Crea un itinerario completo.\n${prompt}` }],
      `Lingua del browser: ${locale}\nUsa sempre action create_itinerary.`,
    )
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Chat non disponibile', 502)
  }
  const proposal = parseRawProposal(raw, locale)
  if (typeof proposal === 'string') return error(proposal)
  proposal.action = 'create_itinerary'
  const conversationId = await ensureConversation(c.env.DB, null, null)
  await saveMessage(c.env.DB, conversationId, 'user', prompt)
  await saveMessage(c.env.DB, conversationId, 'assistant', proposal.message)
  return json({ conversation_id: conversationId, proposal } satisfies AiChatResponse)
})

ai.post('/modify-itinerary', async (c) => {
  const body = (await c.req.json()) as Record<string, unknown>
  const itineraryId = asString(body.itinerary_id, 80)
  if (!itineraryId) return error('Manca l’itinerario da modificare')
  const existing = await getItinerary(c.env.DB, itineraryId)
  if (!existing) return error('Itinerario non trovato', 404)

  if (body.apply === true) {
    if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'write'))) {
      return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
    }
    const parsed = validateItinerary(body.itinerary)
    if (typeof parsed === 'string') return error(parsed)
    await saveRevision(c.env.DB, itineraryId)
    const matched = parsed.stops ? matchStopsByName(existing.stops, parsed.stops) : parsed.stops
    await updateItineraryFields(c.env.DB, itineraryId, { ...parsed, stops: matched })
    return json(await getItinerary(c.env.DB, itineraryId))
  }

  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'ai'))) {
    return error('Troppe richieste alla chat da questo indirizzo. Riprova tra un minuto.', 429)
  }

  const key = await requireKey(c.env)
  if (key instanceof Response) return key
  const instruction = asString(body.instruction ?? body.message, MAX_PROMPT)
  if (instruction.length < 2) return error('Descrivi la modifica')
  const locale = asString(body.locale, 16) || 'it'
  let raw: unknown
  try {
    raw = await runModel(
      c.env,
      [{ role: 'user', content: instruction }],
      `Lingua del browser: ${locale}\nItinerario da modificare:\n${JSON.stringify(compactItinerary(existing))}\nUsa action update_itinerary.`,
    )
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Chat non disponibile', 502)
  }
  const proposal = parseRawProposal(raw, locale)
  if (typeof proposal === 'string') return error(proposal)
  proposal.action = 'update_itinerary'
  const conversationId = await ensureConversation(
    c.env.DB,
    body.conversation_id ? asString(body.conversation_id, 80) : null,
    itineraryId,
  )
  await saveMessage(c.env.DB, conversationId, 'user', instruction)
  await saveMessage(c.env.DB, conversationId, 'assistant', proposal.message)
  return json({ conversation_id: conversationId, proposal } satisfies AiChatResponse)
})
