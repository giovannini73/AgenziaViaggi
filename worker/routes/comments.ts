import { Hono } from 'hono'
import { identifyUser } from '../lib/auth'
import { getItinerary, getStop, listItineraryComments, listStopComments, upsertItineraryRating, upsertStopRating } from '../lib/db'
import { enforceRateLimit } from '../lib/rateLimit'
import { clientIp, error, json, nowIso } from '../lib/util'
import { validateComment } from '../lib/validate'

type AppEnv = { Bindings: Env }

export const comments = new Hono<AppEnv>()

comments.get('/itineraries/:id/comments', async (c) => {
  if (!(await getItinerary(c.env.DB, c.req.param('id')))) return error('Itinerario non trovato', 404)
  return json(await listItineraryComments(c.env.DB, c.req.param('id')))
})

comments.post('/itineraries/:id/comments', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'comment'))) {
    return error('Troppi commenti da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const user = await identifyUser(c.req.raw, c.env)
  const id = c.req.param('id')
  if (!(await getItinerary(c.env.DB, id))) return error('Itinerario non trovato', 404)
  const parsed = validateComment(await c.req.json())
  if (typeof parsed === 'string') return error(parsed)
  const author = parsed.author_name || user?.name || ''
  await c.env.DB
    .prepare(
      'INSERT INTO itinerary_comments (id, itinerary_id, author_name, comment, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(crypto.randomUUID(), id, author, parsed.comment, parsed.rating, nowIso())
    .run()
  if (parsed.rating != null && user) {
    await upsertItineraryRating(c.env.DB, id, user.id, parsed.rating)
  }
  return json(await listItineraryComments(c.env.DB, id), 201)
})

comments.get('/stops/:id/comments', async (c) => {
  if (!(await getStop(c.env.DB, c.req.param('id')))) return error('Tappa non trovata', 404)
  return json(await listStopComments(c.env.DB, c.req.param('id')))
})

comments.post('/stops/:id/comments', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'comment'))) {
    return error('Troppi commenti da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const user = await identifyUser(c.req.raw, c.env)
  const id = c.req.param('id')
  if (!(await getStop(c.env.DB, id))) return error('Tappa non trovata', 404)
  const parsed = validateComment(await c.req.json())
  if (typeof parsed === 'string') return error(parsed)
  const author = parsed.author_name || user?.name || ''
  await c.env.DB
    .prepare(
      'INSERT INTO stop_comments (id, stop_id, author_name, comment, rating, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(crypto.randomUUID(), id, author, parsed.comment, parsed.rating, nowIso())
    .run()
  if (parsed.rating != null && user) {
    await upsertStopRating(c.env.DB, id, user.id, parsed.rating)
  }
  return json(await listStopComments(c.env.DB, id), 201)
})
