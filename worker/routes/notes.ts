import { Hono } from 'hono'
import { identifyUser } from '../lib/auth'
import {
  deleteStopNote,
  getStop,
  getStopNote,
  insertStopNote,
  listStopNotes,
} from '../lib/db'
import { enforceRateLimit } from '../lib/rateLimit'
import { clientIp, error, json } from '../lib/util'
import { validateNote } from '../lib/validate'

type AppEnv = { Bindings: Env }

export const notes = new Hono<AppEnv>()

notes.get('/stops/:id/notes', async (c) => {
  if (!(await getStop(c.env.DB, c.req.param('id')))) return error('Tappa non trovata', 404)
  return json(await listStopNotes(c.env.DB, c.req.param('id')))
})

notes.post('/stops/:id/notes', async (c) => {
  if (!(await enforceRateLimit(c.env.DB, clientIp(c.req.raw), 'comment'))) {
    return error('Troppe note da questo indirizzo. Riprova tra un minuto.', 429)
  }
  const user = await identifyUser(c.req.raw, c.env)
  if (!user) return error('Accesso richiesto', 401)
  const id = c.req.param('id')
  if (!(await getStop(c.env.DB, id))) return error('Tappa non trovata', 404)
  const parsed = validateNote(await c.req.json())
  if (typeof parsed === 'string') return error(parsed)
  await insertStopNote(c.env.DB, id, user.id, user.name, parsed.body, parsed.video_id)
  return json(await listStopNotes(c.env.DB, id), 201)
})

notes.delete('/notes/:id', async (c) => {
  const user = await identifyUser(c.req.raw, c.env)
  if (!user) return error('Accesso richiesto', 401)
  const note = await getStopNote(c.env.DB, c.req.param('id'))
  if (!note) return error('Nota non trovata', 404)
  if (note.user_id !== user.id) return error('Puoi cancellare solo le tue note', 403)
  await deleteStopNote(c.env.DB, note.id)
  return json(await listStopNotes(c.env.DB, note.stop_id))
})
