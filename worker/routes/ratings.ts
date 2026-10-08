import { Hono } from 'hono'
import { identifyUser } from '../lib/auth'
import { getItinerary, getStop, upsertItineraryRating, upsertStopRating, upsertStopSeen } from '../lib/db'
import { enforceRateLimit } from '../lib/rateLimit'
import { clientIp, error, json } from '../lib/util'
import { validateRating } from '../lib/validate'

type AppEnv = { Bindings: Env }

export const ratings = new Hono<AppEnv>()

ratings.post('/itineraries/:id/rating', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'rating'))) {
    return error('Troppi voti da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const user = await identifyUser(c.req.raw, c.env)
  if (!user) return error('Accesso richiesto', 401)
  const id = c.req.param('id')
  if (!(await getItinerary(c.env.DB, id))) return error('Itinerario non trovato', 404)
  const body = (await c.req.json()) as { rating?: unknown }
  const rating = validateRating(body.rating)
  if (rating == null) return error('Il voto deve essere un numero intero da 0 a 5')
  await upsertItineraryRating(c.env.DB, id, user.id, rating)
  return json(await getItinerary(c.env.DB, id))
})

ratings.post('/stops/:id/rating', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'rating'))) {
    return error('Troppi voti da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const user = await identifyUser(c.req.raw, c.env)
  if (!user) return error('Accesso richiesto', 401)
  const id = c.req.param('id')
  const stop = await getStop(c.env.DB, id)
  if (!stop) return error('Tappa non trovata', 404)
  const body = (await c.req.json()) as { rating?: unknown }
  const rating = validateRating(body.rating)
  if (rating == null) return error('Il voto deve essere un numero intero da 0 a 5')
  await upsertStopRating(c.env.DB, id, user.id, rating)
  return json(await getStop(c.env.DB, id))
})

ratings.post('/stops/:id/seen', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'rating'))) {
    return error('Troppe modifiche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const user = await identifyUser(c.req.raw, c.env)
  if (!user) return error('Accesso richiesto', 401)
  const id = c.req.param('id')
  if (!(await getStop(c.env.DB, id))) return error('Tappa non trovata', 404)
  const body = (await c.req.json()) as { seen?: unknown }
  const seen = body.seen === true
  await upsertStopSeen(c.env.DB, id, user.id, seen)
  return json(await getStop(c.env.DB, id))
})
