import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TRAVEL_TAGS } from '../../shared/types'
import type { ItineraryListItem } from '../../shared/types'
import { ItineraryCard } from '../components/ItineraryCard'
import { api } from '../lib/api'
import { TAG_LABELS } from '../lib/format'

export function Home() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [items, setItems] = useState<ItineraryListItem[]>([])
  const [country, setCountry] = useState('')
  const [duration, setDuration] = useState('')
  const [style, setStyle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [pickedId, setPickedId] = useState('')
  const [dupId, setDupId] = useState<string | null>(null)
  const [countries, setCountries] = useState<string[]>([])
  const [styles, setStyles] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterCount = Number(Boolean(country)) + Number(Boolean(duration)) + Number(Boolean(style)) + tags.length

  const params = useMemo(() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (country) p.set('country', country)
    if (duration) p.set('duration', duration)
    if (style) p.set('style', style)
    if (tags.length) p.set('tags', tags.join(','))
    return p
  }, [q, country, duration, style, tags])

  useEffect(() => {
    setPickedId((current) => {
      if (!items.length) return ''
      if (items.some((item) => item.id === current)) return current
      return items[0].id
    })
  }, [items])

  useEffect(() => {
    api
      .itineraries()
      .then((all) => {
        setCountries([...new Set(all.map((i) => i.country).filter(Boolean))])
        setStyles([...new Set(all.map((i) => i.travel_style).filter(Boolean))])
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setLoading(true)
      api
        .itineraries(params)
        .then(setItems)
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false))
    }, 180)
    return () => window.clearTimeout(t)
  }, [params])

  async function duplicate(id: string) {
    setDupId(id)
    try {
      const copy = await api.duplicate(id)
      navigate(`/itinerario/${copy.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplicazione non riuscita')
    } finally {
      setDupId(null)
    }
  }

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function setQ(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  const picked = items.find((item) => item.id === pickedId)

  return (
    <div className="space-y-6 phone-port:space-y-4">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-clay)]">Raccolta aperta</p>
        <h1 className="font-display text-4xl leading-tight md:text-5xl phone-port:text-3xl">Idee di viaggio da costruire insieme</h1>
        <p className="max-w-2xl text-[var(--color-mute)] phone-port:line-clamp-3">
          Itinerari indipendenti, orientati a mercati, cibo locale e ritmi umani. Aprili, commentali, modificati se hai
          una proposta migliore. Puoi anche chiedere alla chat di inventarne uno o di ritoccare le tappe.
        </p>
        <Link to="/crea-con-ai" className="btn-primary inline-flex phone-port:hidden">
          Crea con AI
        </Link>
      </section>

      <section className="card space-y-3 p-4 phone-port:space-y-2 phone-port:p-3">
        <button type="button" className="hidden min-h-11 w-full items-center gap-2 text-left text-sm font-bold phone-port:!flex" aria-expanded={filtersOpen} aria-controls="itinerary-search-filters" onClick={() => setFiltersOpen((open) => !open)}>
          <SlidersHorizontal className="h-5 w-5" aria-hidden />
          <span className="flex-1">Filtri di ricerca{filterCount ? ` · ${filterCount} attivi` : ''}</span>
          {filtersOpen ? <ChevronUp className="h-5 w-5" aria-hidden /> : <ChevronDown className="h-5 w-5" aria-hidden />}
        </button>
        <div id="itinerary-search-filters" className={`space-y-3 ${filtersOpen ? '' : 'phone-port:hidden'}`}>
        <input
          className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 max-md:portrait:hidden"
          placeholder="Cerca un paese, una città, un’idea…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <select className="rounded-2xl border border-[var(--color-line)] bg-white px-3 py-2" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Tutti i paesi</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="rounded-2xl border border-[var(--color-line)] bg-white px-3 py-2" value={duration} onChange={(e) => setDuration(e.target.value)}>
            <option value="">Qualsiasi durata</option>
            <option value="short">Fino a 7 giorni</option>
            <option value="medium">8–14 giorni</option>
            <option value="long">15–21 giorni</option>
            <option value="xl">Oltre 21 giorni</option>
          </select>
          <select className="rounded-2xl border border-[var(--color-line)] bg-white px-3 py-2" value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="">Qualsiasi tipo di viaggio</option>
            {styles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_TAGS.filter((t) => ['mare', 'natura', 'archeologia', 'cultura', 'cibo', 'citta', 'relax'].includes(t)).map(
            (tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-2 text-sm font-semibold ${
                  tags.includes(tag) ? 'bg-[var(--color-forest)] text-white' : 'bg-[var(--color-sand)]'
                }`}
              >
                {TAG_LABELS[tag]}
              </button>
            ),
          )}
        </div>
        </div>
      </section>

      {error ? <p className="text-red-700">{error}</p> : null}
      {loading ? <p>Caricamento itinerari…</p> : null}
      {!loading && items.length === 0 ? <p>Nessun itinerario con questi filtri.</p> : null}

      {!loading && items.length ? (
        <>
          <label className="hidden space-y-1 phone-land:!block">
            <span className="text-sm font-semibold">Itinerari</span>
            <select
              className="field min-h-12"
              value={pickedId}
              onChange={(e) => setPickedId(e.target.value)}
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.country ? `${item.title} · ${item.country}` : item.title}
                </option>
              ))}
            </select>
          </label>
          {picked ? (
            <div className="hidden phone-land:!block">
              <ItineraryCard item={picked} onDuplicate={duplicate} duplicating={dupId === picked.id} />
            </div>
          ) : null}
          <div className="grid gap-5 md:grid-cols-2 phone-land:!hidden">
            {items.map((item) => (
              <ItineraryCard key={item.id} item={item} onDuplicate={duplicate} duplicating={dupId === item.id} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
