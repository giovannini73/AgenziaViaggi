import { useState, type FormEvent } from 'react'
import { Compass } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { APP_VERSION } from '../lib/version'

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/'
  if (raw.startsWith('/accedi')) return '/'
  return raw
}

export function Accedi() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.login(password)
      navigate(safeNext(params.get('next')))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accesso non riuscito')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <form className="card w-full max-w-md space-y-4 p-8 phone-port:p-5" onSubmit={onSubmit}>
        <div className="flex items-center gap-2 text-[var(--color-forest)]">
          <Compass className="h-7 w-7" strokeWidth={1.75} />
          <span className="flex items-baseline gap-1.5 leading-none">
            <span className="font-display text-xl font-semibold">Itinerari aperti</span>
            <span className="text-sm font-semibold tracking-wide text-[var(--color-mute)]">v{APP_VERSION}</span>
          </span>
        </div>
        <h1 className="font-display text-3xl leading-tight">Accesso</h1>
        <p className="text-[var(--color-mute)]">Inserisci la tua password per aprire la raccolta.</p>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Password</span>
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm font-semibold text-[var(--color-clay)]">{error}</p> : null}
        <button className="btn-primary w-full" type="submit" disabled={busy}>
          {busy ? 'Accesso…' : 'Entra'}
        </button>
      </form>
    </div>
  )
}
