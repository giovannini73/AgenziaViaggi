import { Compass, LogOut, Plus, Search, Sparkles } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { SessionProvider, useSession } from '../lib/session'
import { APP_TITLE, APP_VERSION } from '../lib/version'
import { AiChat } from './AiChat'

export function Layout() {
  return (
    <SessionProvider>
      <LayoutInner />
    </SessionProvider>
  )
}

function LayoutInner() {
  const me = useSession()

  async function esci() {
    try {
      await api.logout()
    } catch {
      /* continua comunque alla pagina di accesso */
    }
    window.location.assign('/accedi')
  }

  const esciTitle = me ? `Esci (${me.name})` : 'Esci'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-paper)_88%,white)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 max-md:portrait:gap-1.5 max-md:portrait:px-3 max-md:portrait:py-2 phone:gap-1 phone:px-3 phone:py-1.5">
          <Link to="/" className="flex shrink-0 items-center gap-2 text-[var(--color-forest)]" title={APP_TITLE} aria-label={APP_TITLE}>
            <Compass className="h-7 w-7 phone:h-6 phone:w-6" strokeWidth={1.75} />
            <span className="flex min-w-0 items-baseline gap-1.5 leading-none">
              <span className="font-display text-xl font-semibold max-md:portrait:hidden phone-land:hidden">
                Itinerari aperti
              </span>
              <span className="text-sm font-semibold tracking-wide text-[var(--color-mute)]">v{APP_VERSION}</span>
            </span>
          </Link>
          <HeaderSearch />
          <nav className="flex shrink-0 flex-wrap items-center justify-end gap-2 max-md:portrait:flex-nowrap max-md:portrait:gap-1 phone:flex-nowrap phone:gap-1">
            {me ? (
              <span className="max-w-24 truncate text-sm font-semibold text-[var(--color-forest)] max-md:portrait:hidden phone-land:hidden">
                {me.name}
              </span>
            ) : null}
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-full px-3 py-2 text-sm font-semibold max-md:portrait:hidden phone:min-h-9 phone:px-2.5 phone:py-1 ${isActive ? 'bg-[var(--color-forest)] text-white' : 'text-[var(--color-ink)]'}`
              }
            >
              Raccolta
            </NavLink>
            <Link
              to="/crea-con-ai"
              className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-bold max-md:portrait:h-11 max-md:portrait:w-11 max-md:portrait:min-h-11 max-md:portrait:px-0 phone:min-h-9 phone:px-2.5"
              aria-label="Crea con AI"
              title="Crea con AI"
            >
              <Sparkles className="h-4 w-4" />
              <span className="max-md:portrait:hidden phone-land:hidden">Crea con AI</span>
            </Link>
            <Link
              to="/nuovo"
              className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full bg-[var(--color-clay)] px-4 py-2 text-sm font-bold text-white max-md:portrait:h-11 max-md:portrait:w-11 max-md:portrait:min-h-11 max-md:portrait:px-0 phone:min-h-9 phone:px-2.5"
              aria-label="Nuovo itinerario"
              title="Nuovo itinerario"
            >
              <Plus className="h-4 w-4" />
              <span className="max-md:portrait:hidden phone-land:hidden">Nuovo itinerario</span>
            </Link>
            <button
              type="button"
              onClick={() => void esci()}
              className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-bold max-md:portrait:h-11 max-md:portrait:w-11 max-md:portrait:min-h-11 max-md:portrait:px-0 phone:min-h-9 phone:px-2.5"
              aria-label={esciTitle}
              title={esciTitle}
            >
              <LogOut className="h-4 w-4" />
              <span className="max-md:portrait:hidden phone-land:hidden">Esci</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 phone:px-3 phone:py-3">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-sm text-[var(--color-mute)] phone:px-3 phone:pb-6">
        <p className="phone:hidden">Raccolta collaborativa di idee di viaggio. Chiunque può aprire, modificare, votare e commentare.</p>
        <p className="mt-1 text-xs font-semibold tracking-wide">v{APP_VERSION}</p>
      </footer>
      <AiChat />
    </div>
  )
}

function HeaderSearch() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const q = params.get('q') || ''

  function update(value: string) {
    if (location.pathname !== '/') {
      navigate(value.trim() ? `/?q=${encodeURIComponent(value)}` : '/')
      return
    }
    const next = new URLSearchParams(params)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  return (
    <label className="relative hidden min-w-0 flex-1 max-md:portrait:!block">
      <span className="sr-only">Cerca</span>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-[var(--color-mute)]"
        aria-hidden
      />
      <input
        className="field min-h-10 py-1.5 pr-3 pl-8 text-sm"
        type="search"
        placeholder="Cerca…"
        value={location.pathname === '/' ? q : ''}
        onChange={(e) => update(e.target.value)}
        autoComplete="off"
      />
    </label>
  )
}
