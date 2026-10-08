import { Hono } from 'hono'
import { enforceRateLimit } from '../lib/rateLimit'
import { asString, clientIp, error } from '../lib/util'
import { searchYoutubeVideos } from '../lib/youtube'

type AppEnv = { Bindings: Env }

export const videos = new Hono<AppEnv>()

videos.get('/videos', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'media'))) {
    return error('Troppe ricerche da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const q = asString(c.req.query('q'), 160)
  if (q.length < 2) return error('Indica un luogo da cercare.', 400)
  const locale = asString(c.req.query('locale'), 16) || 'it'
  const results = await searchYoutubeVideos(q, locale)
  return Response.json(
    { videos: results },
    {
      headers: { 'Cache-Control': 'public, max-age=900' },
    },
  )
})
