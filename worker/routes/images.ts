import { Hono } from 'hono'
import { searchPlaceImages } from '../lib/images'
import { enforceRateLimit } from '../lib/rateLimit'
import { asString, clientIp, error } from '../lib/util'

type AppEnv = { Bindings: Env }

export const images = new Hono<AppEnv>()

images.get('/images', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'media'))) {
    return error('Troppe ricerche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const q = asString(c.req.query('q'), 160)
  if (q.length < 2) return error('Indica un luogo da cercare.', 400)
  const results = await searchPlaceImages(q)
  return Response.json(
    { images: results },
    {
      headers: { 'Cache-Control': 'public, max-age=900' },
    },
  )
})
