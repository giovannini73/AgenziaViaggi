import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ai } from './routes/ai'
import { comments } from './routes/comments'
import { images } from './routes/images'
import { itineraries } from './routes/itineraries'
import { notes } from './routes/notes'
import { ratings } from './routes/ratings'
import { stops } from './routes/stops'
import { videos } from './routes/videos'
import { accessConfigured, identifyUser, isPublicPath, loginResponse, logoutResponse, meResponse, redirectToLogin } from './lib/auth'
import { allowedOrigin, error } from './lib/util'

const app = new Hono<{ Bindings: Env }>()

app.use(
  '/api/*',
  cors({
    origin: (origin) => allowedOrigin(origin) || '',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
    maxAge: 86400,
  }),
)

app.onError((err) => {
  console.error(err)
  return error('Si è verificato un errore. Riprova.', 500)
})

app.route('/api/itineraries', itineraries)
app.route('/api/stops', stops)
app.route('/api/ai', ai)
app.route('/api', ratings)
app.route('/api', comments)
app.route('/api', notes)
app.route('/api', videos)
app.route('/api', images)

app.all('/api/*', (c) => error('Percorso non trovato', 404))

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/login' && request.method === 'POST') {
      return loginResponse(request, env)
    }
    if (url.pathname === '/api/logout' && (request.method === 'POST' || request.method === 'GET')) {
      return logoutResponse(request)
    }

    if (accessConfigured(env) && !isPublicPath(url.pathname, request.method)) {
      const user = await identifyUser(request, env)
      if (!user) {
        if (url.pathname.startsWith('/api/')) return error('Accesso richiesto', 401)
        return redirectToLogin(request)
      }
      if (url.pathname === '/api/me' && request.method === 'GET') return meResponse(user)
    }

    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx)
    }
    const asset = await env.ASSETS.fetch(request)
    const type = asset.headers.get('Content-Type') || ''
    if (type.includes('text/html')) {
      const headers = new Headers(asset.headers)
      headers.set('Cache-Control', 'private, no-store')
      return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers })
    }
    return asset
  },
}
