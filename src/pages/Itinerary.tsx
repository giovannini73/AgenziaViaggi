import { ArrowLeft, ArrowRight, Copy, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ItineraryDetail, StopNoteItem } from '../../shared/types'
import { voteBadge } from '../../shared/types'
import { Comments } from '../components/Comments'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ExpandBadge } from '../components/ExpandBadge'
import { StopCard } from '../components/StopCard'
import { StopCombobox } from '../components/StopCombobox'
import { TravelMap } from '../components/TravelMap'
import { TripTimeline } from '../components/TripTimeline'
import { Transfers } from '../components/Transfers'
import { TripTabLabel } from '../components/TripTabLabel'
import { arrivalDate } from '../../shared/schedule'
import { UserVotes } from '../components/UserVotes'
import { api } from '../lib/api'
import { formatDate, formatDuration } from '../lib/format'
import { useSession } from '../lib/session'

const tripTabs = [
  { id: 'detail', label: 'Dettaglio' },
  { id: 'stops', label: 'Tappe' },
  { id: 'map', label: 'Mappa' },
  { id: 'days', label: 'Giorni della vacanza' },
  { id: 'transfers', label: 'Spostamenti' },
] as const
type TripTab = (typeof tripTabs)[number]['id']

export function Itinerary() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useSession()
  const [data, setData] = useState<ItineraryDetail | null>(null)
  const [error, setError] = useState('')
  const [dupBusy, setDupBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [stopIndex, setStopIndex] = useState(0)
  const [departureDraft, setDepartureDraft] = useState<{ id: string; date: string } | null>(null)
  const [dateBusy, setDateBusy] = useState(false)
  const [dateError, setDateError] = useState('')
  const [dateSaved, setDateSaved] = useState(false)
  const [nightsBusy, setNightsBusy] = useState(false)
  const [nightsError, setNightsError] = useState('')
  const [activeTab, setActiveTab] = useState<TripTab>('detail')

  useEffect(() => {
    setStopIndex(0)
    setActiveTab('detail')
  }, [id])

  useEffect(() => {
    if (!id) return
    api
      .itinerary(id)
      .then(setData)
      .catch((err: Error) => setError(err.message))
    const refresh = () => {
      api.itinerary(id).then(setData).catch(() => undefined)
    }
    window.addEventListener('itinerary-updated', refresh)
    return () => window.removeEventListener('itinerary-updated', refresh)
  }, [id])

  if (error) return <p className="text-red-700">{error}</p>
  if (!data) return <p>Caricamento itinerario…</p>

  async function duplicate() {
    if (!data) return
    setDupBusy(true)
    try {
      const copy = await api.duplicate(data.id)
      navigate(`/itinerario/${copy.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplicazione non riuscita')
    } finally {
      setDupBusy(false)
    }
  }

  async function remove() {
    if (!data) return
    setDeleting(true)
    try {
      await api.remove(data.id)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eliminazione non riuscita')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const currentStop = data.stops[Math.min(stopIndex, Math.max(0, data.stops.length - 1))]
  const itineraryId = data.id
  const departure = departureDraft?.id === itineraryId ? departureDraft.date : data.start_date || ''

  async function markStopSeen(stop: { id: string }, seen: boolean) {
    await api.markStopSeen(stop.id, seen)
    setData(await api.itinerary(itineraryId))
  }

  async function saveDeparture() {
    setDateBusy(true)
    setDateError('')
    setDateSaved(false)
    try {
      const fresh = await api.updateDeparture(itineraryId, departure || null)
      setData(fresh)
      setDepartureDraft(null)
      setDateSaved(true)
    } catch (err) {
      setDateError(err instanceof Error ? err.message : 'Salvataggio della data non riuscito')
    } finally {
      setDateBusy(false)
    }
  }

  async function changeNights(index: number, nights: number) {
    if (!data || nightsBusy) return
    setNightsBusy(true)
    setNightsError('')
    try {
      setData(await api.updateNights(data.stops[index].id, nights))
    } catch (err) {
      setNightsError(err instanceof Error ? err.message : 'Salvataggio delle notti non riuscito')
    } finally { setNightsBusy(false) }
  }

  async function changeTimelineTransfers(index: number, events: import('../../shared/types').TimelineTransfer[]) {
    if (!data || nightsBusy || dateBusy) return
    setNightsBusy(true)
    setNightsError('')
    try { setData(await api.updateTimelineTransfers(data.stops[index].id, events)) }
    catch (err) { setNightsError(err instanceof Error ? err.message : 'Salvataggio del trasferimento non riuscito') }
    finally { setNightsBusy(false) }
  }

  async function moveTimelineStop(index: number, direction: -1 | 1) {
    if (!data || nightsBusy || dateBusy) return
    setNightsBusy(true)
    setNightsError('')
    const selectedId = currentStop?.id
    try {
      const fresh = await api.moveStop(data.stops[index].id, direction)
      setData(fresh)
      setStopIndex(Math.max(0, fresh.stops.findIndex((stop) => stop.id === selectedId)))
    } catch (err) {
      setNightsError(err instanceof Error ? err.message : 'Spostamento della tappa non riuscito')
    } finally { setNightsBusy(false) }
  }

  return (
    <article className="space-y-8 phone-port:space-y-4 phone-land:space-y-3">
      <section className="trip-header overflow-hidden rounded-3xl bg-[var(--color-forest)] text-[var(--color-paper)]">
        {data.cover_image ? (
          <img
            src={data.cover_image}
            alt=""
            className="trip-header-image h-56 w-full object-cover opacity-90 md:h-72"
          />
        ) : null}
        <div className="trip-header-content space-y-3 p-5 md:p-8">
          <p className="trip-header-country text-sm opacity-80">{data.country}</p>
          <h1 className="font-display text-4xl leading-tight md:text-5xl">{data.title}</h1>
          <div className="trip-header-actions flex flex-wrap gap-2 pt-2">
            <Link to={`/itinerario/${data.id}/modifica`} aria-label="Modifica itinerario" title="Modifica itinerario" className="trip-header-action rounded-full bg-white px-4 py-2 text-sm font-bold text-[var(--color-forest)]">
              <Pencil className="trip-action-icon h-5 w-5" aria-hidden /><span className="trip-action-label">Modifica itinerario</span>
            </Link>
            <button type="button" onClick={() => void duplicate()} disabled={dupBusy} aria-label={dupBusy ? 'Duplicazione in corso' : 'Duplica itinerario'} title="Duplica itinerario" className="trip-header-action rounded-full border border-white/40 px-4 py-2 text-sm font-bold disabled:opacity-50">
              <Copy className="trip-action-icon h-5 w-5" aria-hidden /><span className="trip-action-label">Duplica itinerario</span>
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Elimina itinerario" title="Elimina itinerario" className="trip-header-action rounded-full border border-white/40 px-4 py-2 text-sm font-bold">
              <Trash2 className="trip-action-icon h-5 w-5" aria-hidden /><span className="trip-action-label">Elimina itinerario</span>
            </button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminare questo itinerario?"
        message={`«${data.title}» verrà rimosso dalla raccolta. Conferma solo se sei sicuro.`}
        confirmLabel="Elimina itinerario"
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />

      <div className="overflow-x-auto border-b border-[var(--color-line)]" role="tablist" aria-label="Schede del viaggio">
        <div className="trip-tabs-row flex min-w-max gap-1">
          {tripTabs.map((tab, index) => (
            <button
              key={tab.id}
              id={`trip-tab-${tab.id}`}
              type="button"
              role="tab"
              title={tab.label}
              aria-label={tab.label}
              aria-selected={activeTab === tab.id}
              aria-controls={`trip-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => {
                let next = index
                if (event.key === 'ArrowRight') next = (index + 1) % tripTabs.length
                else if (event.key === 'ArrowLeft') next = (index + tripTabs.length - 1) % tripTabs.length
                else if (event.key === 'Home') next = 0
                else if (event.key === 'End') next = tripTabs.length - 1
                else return
                event.preventDefault()
                setActiveTab(tripTabs[next].id)
                document.getElementById(`trip-tab-${tripTabs[next].id}`)?.focus()
              }}
              className={`trip-tab min-h-12 rounded-t-2xl border-b-4 px-4 py-3 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-forest)] ${activeTab === tab.id ? 'border-[var(--color-forest)] bg-white text-[var(--color-forest)]' : 'border-transparent text-[var(--color-mute)] hover:bg-white/60'}`}
            >
              <TripTabLabel id={tab.id} label={tab.label} />
            </button>
          ))}
        </div>
      </div>

      <div id="trip-panel-detail" role="tabpanel" aria-labelledby="trip-tab-detail" hidden={activeTab !== 'detail'} className={activeTab === 'detail' ? 'space-y-3' : 'hidden'}>
        <ExpandBadge label="Nome e dettagli" badge={data.title}>
          <p className="leading-relaxed">{data.description}</p>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Meta label="Durata" value={formatDuration(data.duration_days, data.duration_nights)} />
            <Meta label="Periodo consigliato" value={data.recommended_period || '—'} />
            <Meta label="Partenza" value={`${data.start_city || '—'}${data.start_date ? ` · ${formatDate(data.start_date)}` : ''}`} />
            <Meta label="Arrivo" value={`${data.end_city || '—'}${data.end_date ? ` · ${formatDate(data.end_date)}` : ''}`} />
          </dl>
        </ExpandBadge>

        <ExpandBadge label="Voto" badge={voteBadge(data.votes)}>
          <UserVotes
            votes={data.votes}
            myId={me?.id}
            onRate={async (n) => setData(await api.rateItinerary(data.id, n))}
          />
        </ExpandBadge>

        <ExpandBadge label="Commenti" badge={data.comments.length ? String(data.comments.length) : '0'}>
          <Comments
            comments={data.comments}
            defaultAuthor={me?.name}
            onPublish={async (payload) => {
              const comments = await api.commentItinerary(data.id, payload)
              setData(await api.itinerary(data.id).then((fresh) => ({ ...fresh, comments })))
            }}
          />
        </ExpandBadge>

        <NotesSummary
          stops={data.stops.map((stop, index) => ({
            index,
            position: stop.position,
            name: stop.name,
            notes: stop.notes || [],
          }))}
          onOpenStop={(index) => { setStopIndex(index); setActiveTab('stops') }}
        />
      </div>

      <div id="trip-panel-days" role="tabpanel" aria-labelledby="trip-tab-days" hidden={activeTab !== 'days'} className={activeTab === 'days' ? '' : 'hidden'}>
      <section className="card space-y-4 p-4 md:p-6" aria-labelledby="vacation-days">
        <h2 id="vacation-days" className="font-display text-2xl">Giorni della vacanza</h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block text-sm font-semibold">
            Giorno di partenza
            <input type="date" className="field mt-1" value={departure} disabled={dateBusy} onChange={(e) => { setDepartureDraft({ id: itineraryId, date: e.target.value }); setDateSaved(false); setDateError('') }} />
          </label>
          <div className="pb-2 text-sm">
            <p className="font-semibold">Giorno di arrivo</p>
            <p aria-live="polite">{formatDate(arrivalDate(departure, data.stops)) || (data.stops.length ? 'Seleziona la partenza' : 'Aggiungi le tappe')}</p>
          </div>
          <button type="button" className="btn-primary" disabled={dateBusy || nightsBusy || departure === (data.start_date || '')} onClick={() => void saveDeparture()}>
            {dateBusy ? 'Salvataggio…' : 'Salva partenza'}
          </button>
        </div>
        {dateError ? <p role="alert" className="text-sm text-red-700">{dateError}</p> : null}
        {dateSaved ? <p role="status" className="text-sm text-[var(--color-forest)]">Date salvate.</p> : null}
        {nightsError ? <p role="alert" className="text-sm text-red-700">{nightsError}</p> : null}
        <TripTimeline stops={data.stops} startDate={departure || null} country={data.country} selectedIndex={stopIndex} onSelect={(index) => { setStopIndex(index); setActiveTab('stops') }} busy={nightsBusy || dateBusy} onTransfersChange={changeTimelineTransfers} onMove={(index, direction) => void moveTimelineStop(index, direction)} onNightsChange={(index, nights) => void changeNights(index, nights)} />
      </section>
      </div>

      <div id="trip-panel-transfers" role="tabpanel" aria-labelledby="trip-tab-transfers" hidden={activeTab !== 'transfers'} className={activeTab === 'transfers' ? '' : 'hidden'}>
      <Transfers stops={data.stops} country={data.country} onUpdate={(stop) => setData((current) => current ? { ...current, stops: current.stops.map((item) => item.id === stop.id ? { ...item, transfer_minutes: stop.transfer_minutes, transfer_distance_km: stop.transfer_distance_km, transfer_mode: stop.transfer_mode } : item) } : current)} />
      {data.stops.length < 2 ? <p className="card p-4 text-[var(--color-mute)]">Servono almeno due tappe per visualizzare gli spostamenti.</p> : null}
      </div>

      <div id="trip-panel-map" role="tabpanel" aria-labelledby="trip-tab-map" hidden={activeTab !== 'map'} className={activeTab === 'map' ? 'space-y-3' : 'hidden'}>
      {activeTab === 'map' ? (
      <TravelMap
        stops={data.stops}
        country={data.country}
        selectedIndex={stopIndex}
        onSelect={setStopIndex}
        onSeen={(stop, seen) => void markStopSeen(stop, seen)}
        className="phone-land:min-h-0"
      />
      ) : null}
      {currentStop ? <button type="button" className="btn-ghost" onClick={() => setActiveTab('stops')}>Apri tappa: {currentStop.name}</button> : null}
      </div>

      <div id="trip-panel-stops" role="tabpanel" aria-labelledby="trip-tab-stops" hidden={activeTab !== 'stops'} className={activeTab === 'stops' ? '' : 'hidden'}>
      <section className="space-y-4 phone-land:space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl phone-port:text-2xl phone-land:text-2xl">Tappe</h2>
          {data.stops.length ? (
            <p className="text-sm font-semibold text-[var(--color-mute)]">
              Tappa {Math.min(stopIndex, data.stops.length - 1) + 1} di {data.stops.length}
            </p>
          ) : null}
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:max-h-[80svh] lg:overflow-y-auto" aria-label="Lista delle tappe">
        {data.stops.length ? (
          <>
            <div className="lg:hidden">
            <StopCombobox
              stops={data.stops}
              value={Math.min(stopIndex, data.stops.length - 1)}
              onChange={setStopIndex}
              onSeen={(stop, seen) => void markStopSeen(stop, seen)}
            />
            </div>
            <label className="hidden items-center gap-2 phone-land:!flex lg:!hidden">
              <select
                className="field min-h-12 min-w-0 flex-1"
                value={String(Math.min(stopIndex, data.stops.length - 1))}
                onChange={(e) => setStopIndex(Number(e.target.value))}
                aria-label="Scegli una tappa"
              >
                {data.stops.map((stop, i) => (
                  <option key={stop.id} value={i}>
                    {stop.position}. {stop.name}
                  </option>
                ))}
              </select>
            </label>
            {currentStop ? (
              <div className="hidden phone-land:!block lg:!hidden">
                <UserVotes
                  votes={currentStop.votes}
                  myId={me?.id}
                  layout="row"
                  showSeen
                  onSeen={(seen) => void markStopSeen(currentStop, seen)}
                />
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 max-md:portrait:hidden phone-land:!hidden lg:!grid">
              {data.stops.map((stop, i) => (
                <div
                  key={stop.id}
                  className={`rounded-2xl px-3 py-2 ${
                    i === stopIndex
                      ? 'bg-[var(--color-forest)] text-white [&_.star-on]:text-[#f4e4c8] [&_.star-off]:text-white/40'
                      : 'bg-white'
                  }`}
                >
                  <button
                    type="button"
                    aria-current={i === stopIndex ? 'step' : undefined}
                    onClick={() => setStopIndex(i)}
                    className="block min-h-9 w-full text-left text-sm font-bold"
                  >
                    {stop.position}. {stop.name}
                  </button>
                  <div className={`mt-1 ${i === stopIndex ? 'text-white/90' : 'text-[var(--color-mute)]'}`}>
                    <UserVotes
                      votes={stop.votes}
                      myId={me?.id}
                      layout="row"
                      showSeen
                      onSeen={(seen) => void markStopSeen(stop, seen)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
        </aside>
        <div className="min-w-0 space-y-4" aria-label="Dettaglio della tappa">
        {currentStop ? (
          <StopCard
            key={currentStop.id}
            stop={currentStop}
            nextStop={data.stops[Math.min(stopIndex, data.stops.length - 1) + 1]}
            itineraryCountry={data.country}
            onRate={async (n) => {
              await api.rateStop(currentStop.id, n)
              setData(await api.itinerary(data.id))
            }}
            onSeen={async (seen) => {
              await markStopSeen(currentStop, seen)
            }}
            onComment={async (payload) => {
              await api.commentStop(currentStop.id, payload)
              setData(await api.itinerary(data.id))
            }}
            onFavorite={(stop) =>
              setData((current) =>
                current
                  ? { ...current, stops: current.stops.map((item) => (item.id === stop.id ? { ...item, ...stop } : item)) }
                  : current,
              )
            }
            onNotes={(notes) =>
              setData((current) =>
                current
                  ? {
                      ...current,
                      stops: current.stops.map((item) => (item.id === currentStop.id ? { ...item, notes } : item)),
                    }
                  : current,
              )
            }
          />
        ) : (
          <p>Nessuna tappa.</p>
        )}
        {data.stops.length > 1 ? (
          <div className="flex gap-2 phone-land:gap-1">
            <button
              type="button"
              className="btn-ghost min-h-12 flex-1 gap-2 phone-port:min-h-11 phone-port:text-sm phone-land:min-h-10 phone-land:text-sm"
              disabled={stopIndex <= 0}
              onClick={() => setStopIndex((i) => Math.max(0, i - 1))}
            >
              <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
              Tappa precedente
            </button>
            <button
              type="button"
              className="btn-primary min-h-12 flex-1 gap-2 phone-port:min-h-11 phone-port:text-sm phone-land:min-h-10 phone-land:text-sm"
              disabled={stopIndex >= data.stops.length - 1}
              onClick={() => setStopIndex((i) => Math.min(data.stops.length - 1, i + 1))}
            >
              Prossima tappa
              <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          </div>
        ) : null}
        </div>
        </div>
      </section>
      </div>
    </article>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-[var(--color-mute)]">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  )
}

function NotesSummary({
  stops,
  onOpenStop,
}: {
  stops: { index: number; position: number; name: string; notes: StopNoteItem[] }[]
  onOpenStop: (index: number) => void
}) {
  const withNotes = stops.filter((stop) => stop.notes.length)
  const count = stops.reduce((total, stop) => total + stop.notes.length, 0)
  return (
    <ExpandBadge label="Note" badge={count ? String(count) : '0'}>
      {withNotes.length === 0 ? (
        <p className="text-sm text-[var(--color-mute)]">
          Nessuna nota. Aprite un video di una tappa e scrivete mentre lo guardate.
        </p>
      ) : (
        <div className="space-y-4">
          {withNotes.map((stop) => (
            <section key={`${stop.position}-${stop.name}`}>
              <button
                type="button"
                className="text-left text-sm font-bold text-[var(--color-forest)] underline"
                onClick={() => onOpenStop(stop.index)}
              >
                {stop.position}. {stop.name}
              </button>
              <ul className="mt-2 space-y-2">
                {stop.notes.map((note) => (
                  <li key={note.id} className="rounded-2xl bg-white/80 p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <strong className="text-sm">{note.author_name || 'Viaggiatore'}</strong>
                      <time className="text-[11px] text-[var(--color-mute)]">
                        {new Date(note.created_at).toLocaleString('it-IT')}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{note.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </ExpandBadge>
  )
}
