import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { TRAVEL_TAGS, fillVotes, type ItineraryInput, type Revision, type StopInput } from '../../shared/types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CoverImagePicker } from '../components/CoverImagePicker'
import { TravelMap } from '../components/TravelMap'
import { TripTimeline } from '../components/TripTimeline'
import { TripTabLabel } from '../components/TripTabLabel'
import { arrivalDate } from '../../shared/schedule'
import { reconcileTransfers, rome2rioUrl } from '../../shared/transfers'
import { api } from '../lib/api'
import { TAG_LABELS } from '../lib/format'

type DraftStop = StopInput & { key: string }

const editTabs = [
  { id: 'detail', label: 'Dettaglio' },
  { id: 'stops', label: 'Tappe' },
  { id: 'map', label: 'Mappa' },
  { id: 'days', label: 'Giorni della vacanza' },
  { id: 'transfers', label: 'Spostamenti' },
] as const
type EditTab = (typeof editTabs)[number]['id']

const emptyStop = (): DraftStop => ({
  key: crypto.randomUUID(),
  name: '',
  country: '',
  nights: 2,
  arrival_day: '',
  description: '',
  why_visit: '',
  attractions: '',
  food_notes: '',
  markets: '',
  where_to_eat: '',
  where_to_stay: '',
  beaches: '',
  excursions: '',
  transfer_minutes: null,
  transfer_distance_km: null,
  transfer_mode: '',
  latitude: null,
  longitude: null,
  image_url: null,
  video_url: null,
})

export function EditItinerary() {
  const { id } = useParams()
  const navigate = useNavigate()
  const creating = !id
  const [title, setTitle] = useState('')
  const [activeTab, setActiveTab] = useState<EditTab>('detail')
  const [description, setDescription] = useState('')
  const [country, setCountry] = useState('')
  const [startCity, setStartCity] = useState('')
  const [endCity, setEndCity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [style, setStyle] = useState('')
  const [cover, setCover] = useState('')
  const [coverPickerOpen, setCoverPickerOpen] = useState(false)
  const [period, setPeriod] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [stops, setStops] = useState<DraftStop[]>([emptyStop()])
  const [compactStops, setCompactStops] = useState(true)
  const [openStops, setOpenStops] = useState<Set<string>>(new Set())
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    if (!id) return
    api.itinerary(id).then((item) => {
      setTitle(item.title)
      setDescription(item.description)
      setCountry(item.country)
      setStartCity(item.start_city)
      setEndCity(item.end_city)
      setStartDate(item.start_date || '')
      setStyle(item.travel_style)
      setCover(item.cover_image || '')
      setPeriod(item.recommended_period)
      setTags(item.tags)
      setStops(
        item.stops.map((s) => ({
          key: s.id,
          id: s.id,
          name: s.name,
          country: s.country,
          latitude: s.latitude,
          longitude: s.longitude,
          arrival_day: s.arrival_day,
          nights: s.nights,
          description: s.description,
          why_visit: s.why_visit,
          attractions: s.attractions,
          food_notes: s.food_notes,
          markets: s.markets,
          where_to_eat: s.where_to_eat,
          where_to_stay: s.where_to_stay,
          beaches: s.beaches,
          excursions: s.excursions,
          transfer_minutes: s.transfer_minutes,
          transfer_distance_km: s.transfer_distance_km,
          transfer_mode: s.transfer_mode,
          image_url: s.image_url,
          video_url: s.video_url,
        })),
      )
    }).catch((err: Error) => setError(err.message))
    api.revisions(id).then(setRevisions).catch(() => setRevisions([]))
  }, [id])

  function move(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= stops.length) return
    setStops(reconcileTransfers(stops, arrayMove(stops, index, next)))
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = stops.findIndex((s) => s.key === active.id)
    const newIndex = stops.findIndex((s) => s.key === over.id)
    setStops(reconcileTransfers(stops, arrayMove(stops, oldIndex, newIndex)))
  }

  function updateStop(key: string, patch: Partial<DraftStop>) {
    setStops((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }

  const endDate = arrivalDate(startDate, stops) || ''

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const body: ItineraryInput = {
      title,
      description,
      country,
      start_city: startCity,
      end_city: endCity,
      start_date: startDate || null,
      end_date: endDate || null,
      travel_style: style,
      cover_image: cover || null,
      tags,
      recommended_period: period,
      stops: stops.map((s) => ({
        id: s.id,
        name: s.name,
        country: s.country,
        latitude: s.latitude,
        longitude: s.longitude,
        arrival_day: s.arrival_day,
        nights: s.nights,
        description: s.description,
        why_visit: s.why_visit,
        attractions: s.attractions,
        food_notes: s.food_notes,
        markets: s.markets,
        where_to_eat: s.where_to_eat,
        where_to_stay: s.where_to_stay,
        beaches: s.beaches,
        excursions: s.excursions,
        transfer_minutes: s.transfer_minutes,
        transfer_distance_km: s.transfer_distance_km,
        transfer_mode: s.transfer_mode,
        image_url: s.image_url,
        video_url: s.video_url,
      })),
    }
    try {
      const saved = creating ? await api.create(body) : await api.update(id!, body)
      navigate(`/itinerario/${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito')
    } finally {
      setBusy(false)
    }
  }

  async function restore(revision_id: string) {
    if (!id) return
    if (!confirm('Ripristinare questa versione? La versione attuale verrà salvata nella cronologia.')) return
    setBusy(true)
    try {
      const saved = await api.restore(id, revision_id)
      navigate(`/itinerario/${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ripristino non riuscito')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!id) return
    setDeleting(true)
    try {
      await api.remove(id)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eliminazione non riuscita')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const mapStops = stops.map((s, i) => ({
    id: s.key,
    itinerary_id: id || '',
    position: i + 1,
    name: s.name || `Tappa ${i + 1}`,
    country: s.country || country,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    arrival_day: s.arrival_day || '',
    nights: s.nights || 0,
    description: s.description || '',
    why_visit: '',
    attractions: '',
    food_notes: '',
    markets: '',
    where_to_eat: '',
    where_to_stay: '',
    beaches: '',
    excursions: '',
    transfer_minutes: s.transfer_minutes ?? null,
    transfer_distance_km: s.transfer_distance_km ?? null,
    transfer_mode: s.transfer_mode || '',
    image_url: s.image_url ?? null,
    video_url: s.video_url ?? null,
    avg_rating: null,
    rating_count: 0,
    votes: fillVotes([]),
  }))

  return (
    <form onSubmit={save} onInvalidCapture={(event) => {
      const input = event.target as HTMLInputElement
      const panel = input.closest('[data-edit-tab]')
      if (panel) {
        event.preventDefault()
        setActiveTab(panel.getAttribute('data-edit-tab') as EditTab)
        const stopFields = input.closest('[id^="stop-fields-"]')
        if (stopFields) {
          const key = stopFields.id.replace('stop-fields-', '')
          setOpenStops((previous) => { const next = new Set(previous); if (compactStops) next.add(key); else next.delete(key); return next })
        }
        setError(input.validationMessage || 'Controlla il campo evidenziato prima di salvare.')
        requestAnimationFrame(() => input.focus())
      }
    }} className="space-y-6">
      <h1 className="font-display text-4xl">{creating ? 'Nuovo itinerario' : 'Modifica itinerario'}</h1>
      {error ? <p className="text-red-700">{error}</p> : null}

      <div className="overflow-x-auto border-b border-[var(--color-line)]" role="tablist" aria-label="Schede modifica viaggio">
        <div className="trip-tabs-row flex min-w-max gap-1">
          {editTabs.map((tab, index) => <button key={tab.id} type="button" role="tab" title={tab.label} aria-label={tab.label} id={`edit-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls={`edit-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => {
            let next = index
            if (event.key === 'ArrowRight') next = (index + 1) % editTabs.length
            else if (event.key === 'ArrowLeft') next = (index + editTabs.length - 1) % editTabs.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = editTabs.length - 1
            else return
            event.preventDefault()
            setActiveTab(editTabs[next].id)
            document.getElementById(`edit-tab-${editTabs[next].id}`)?.focus()
          }} className={`trip-tab min-h-12 rounded-t-2xl border-b-4 px-4 py-3 text-sm font-bold ${activeTab === tab.id ? 'border-[var(--color-forest)] bg-white text-[var(--color-forest)]' : 'border-transparent text-[var(--color-mute)] hover:bg-white/60'}`}><TripTabLabel id={tab.id} label={tab.label} /></button>)}
        </div>
      </div>

      <div id="edit-panel-detail" role="tabpanel" aria-labelledby="edit-tab-detail" data-edit-tab="detail" hidden={activeTab !== 'detail'}>
      <section className="card grid gap-3 p-4 md:grid-cols-2">
        <Field label="Titolo" value={title} onChange={setTitle} required className="md:col-span-2" />
        <label className="md:col-span-2 block text-sm font-semibold">
          Descrizione
          <textarea className="field mt-1 min-h-28" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <Field label="Paese" value={country} onChange={setCountry} />
        <Field label="Stile di viaggio" value={style} onChange={setStyle} />
        <Field label="Città di partenza" value={startCity} onChange={setStartCity} />
        <Field label="Città di arrivo" value={endCity} onChange={setEndCity} />
        <Field label="Data partenza" value={startDate} onChange={setStartDate} type="date" />
        <label className="block text-sm font-semibold">
          Data di arrivo (automatica)
          <input className="field mt-1" type="date" value={endDate} readOnly />
          <span className="mt-1 block text-xs text-[var(--color-mute)]">Calcolata dalla somma delle notti nelle tappe.</span>
        </label>
        <Field label="Periodo consigliato" value={period} onChange={setPeriod} />
        <div className="space-y-2">
          <p className="text-sm font-semibold">Immagine principale</p>
          {cover ? <button type="button" className="block w-full overflow-hidden rounded-2xl" onClick={() => setCoverPickerOpen(true)} aria-label="Cambia immagine principale"><img src={cover} alt="Immagine principale del viaggio" className="h-36 w-full object-cover" /></button> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => setCoverPickerOpen(true)}>Cerca immagine</button>
            {cover ? <button type="button" className="btn-ghost" onClick={() => setCover('')}>Rimuovi immagine</button> : null}
          </div>
        </div>
        <div className="md:col-span-2 flex flex-wrap gap-2">
          {TRAVEL_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${tags.includes(tag) ? 'bg-[var(--color-forest)] text-white' : 'bg-[var(--color-sand)]'}`}
            >
              {TAG_LABELS[tag]}
            </button>
          ))}
        </div>
      </section>
      </div>

      <div id="edit-panel-days" role="tabpanel" aria-labelledby="edit-tab-days" data-edit-tab="days" hidden={activeTab !== 'days'}>
      <section className="card space-y-3 p-4">
        <h2 className="font-display text-2xl">Giorni della vacanza</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Data partenza" value={startDate} onChange={setStartDate} type="date" />
          <label className="block text-sm font-semibold">Data di arrivo (automatica)<input className="field mt-1" type="date" value={endDate} readOnly /></label>
        </div>
        <TripTimeline stops={stops} startDate={startDate || null} country={country} onMove={move} onNightsChange={(index, nights) => updateStop(stops[index].key, { nights })} />
      </section>
      </div>

      <div id="edit-panel-map" role="tabpanel" aria-labelledby="edit-tab-map" data-edit-tab="map" hidden={activeTab !== 'map'}>
        {activeTab === 'map' ? <TravelMap stops={mapStops} country={country} /> : null}
      </div>

      <div id="edit-panel-transfers" role="tabpanel" aria-labelledby="edit-tab-transfers" data-edit-tab="transfers" hidden={activeTab !== 'transfers'}>
        <section className="card space-y-4 p-4">
          <h2 className="font-display text-2xl">Spostamenti</h2>
          <p className="text-sm text-[var(--color-mute)]">Consulta Rome2Rio e annota durata, distanza e mezzo. Le modifiche si salvano con l’itinerario.</p>
          {stops.length < 2 ? <p>Aggiungi almeno due tappe per visualizzare gli spostamenti.</p> : null}
          {stops.slice(1).map((stop, index) => <div key={stop.key} className="space-y-3 rounded-2xl border border-[var(--color-line)] p-3">
            <h3 className="font-bold">{stops[index].name || `Tappa ${index + 1}`} → {stop.name || `Tappa ${index + 2}`}</h3>
            {stops[index].name && stop.name ? <a className="btn-ghost" href={rome2rioUrl(stops[index], stop, country)} target="_blank" rel="noopener noreferrer">Dettaglio su Rome2Rio ↗</a> : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-semibold">Durata (minuti)<input className="field mt-1" type="number" min={0} max={4320} step={1} value={stop.transfer_minutes ?? ''} onChange={(event) => updateStop(stop.key, { transfer_minutes: event.target.value === '' ? null : Number(event.target.value) })} /></label>
              <label className="text-sm font-semibold">Distanza (km)<input className="field mt-1" type="number" min={0} max={20000} step={0.1} value={stop.transfer_distance_km ?? ''} onChange={(event) => updateStop(stop.key, { transfer_distance_km: event.target.value === '' ? null : Number(event.target.value) })} /></label>
              <Field label="Mezzo" value={stop.transfer_mode || ''} onChange={(value) => updateStop(stop.key, { transfer_mode: value })} />
            </div>
          </div>)}
        </section>
      </div>

      <div id="edit-panel-stops" role="tabpanel" aria-labelledby="edit-tab-stops" data-edit-tab="stops" hidden={activeTab !== 'stops'}>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl">Tappe</h2>
          <div className="flex flex-wrap gap-2" aria-label="Visualizzazione tappe">
            <button type="button" className={compactStops ? 'btn-primary' : 'btn-ghost'} aria-pressed={compactStops} onClick={() => { setCompactStops(true); setOpenStops(new Set()) }}>Compatta</button>
            <button type="button" className={!compactStops ? 'btn-primary' : 'btn-ghost'} aria-pressed={!compactStops} onClick={() => { setCompactStops(false); setOpenStops(new Set()) }}>Espansa</button>
          </div>
          <button type="button" className="btn-primary" onClick={() => { const stop = emptyStop(); setStops((prev) => [...prev, stop]); setOpenStops((prev) => new Set(prev).add(stop.key)) }}>
            Aggiungi tappa
          </button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={stops.map((s) => s.key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {stops.map((stop, index) => (
                <SortableStop
                  key={stop.key}
                  stop={stop}
                  index={index}
                  previousStop={index > 0 ? stops[index - 1] : undefined}
                  country={country}
                  expanded={!stop.name || (compactStops ? openStops.has(stop.key) : !openStops.has(stop.key))}
                  onToggle={() => setOpenStops((prev) => { const next = new Set(prev); if (next.has(stop.key)) next.delete(stop.key); else next.add(stop.key); return next })}
                  onChange={(patch) => updateStop(stop.key, patch)}
                  onRemove={() => setStops((prev) => reconcileTransfers(prev, prev.filter((s) => s.key !== stop.key)))}
                  onUp={() => move(index, -1)}
                  onDown={() => move(index, 1)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>
      </div>

      {!creating && revisions.length > 0 ? (
        <section hidden={activeTab !== 'detail'} className="card space-y-2 p-4">
          <h2 className="font-display text-2xl">Ripristina versione</h2>
          <ul className="space-y-2">
            {revisions.map((rev) => (
              <li key={rev.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{new Date(rev.created_at).toLocaleString('it-IT')}</span>
                <button type="button" className="btn-ghost" onClick={() => void restore(rev.id)}>
                  Ripristina versione
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Salvataggio…' : 'Salva itinerario'}
        </button>
        {!creating ? (
          <button type="button" className="btn-ghost text-red-800" onClick={() => setConfirmDelete(true)}>
            Elimina itinerario
          </button>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Eliminare questo itinerario?"
        message={`«${title || 'Questo itinerario'}» verrà rimosso dalla raccolta. Conferma solo se sei sicuro.`}
        confirmLabel="Elimina itinerario"
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
      {coverPickerOpen ? <CoverImagePicker query={[country, title].filter(Boolean).join(' ') || 'viaggio paesaggio'} onSelect={(url) => { setCover(url); setCoverPickerOpen(false) }} onClose={() => setCoverPickerOpen(false)} /> : null}
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  className?: string
}) {
  return (
    <label className={`block text-sm font-semibold ${className}`}>
      {label}
      <input className="field mt-1" type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function SortableStop({
  stop,
  index,
  onChange,
  onRemove,
  onUp,
  onDown,
  expanded,
  onToggle,
  previousStop,
  country,
}: {
  stop: DraftStop
  index: number
  onChange: (patch: Partial<DraftStop>) => void
  onRemove: () => void
  onUp: () => void
  onDown: () => void
  expanded: boolean
  onToggle: () => void
  previousStop?: DraftStop
  country: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stop.key })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-ghost px-2" aria-label="Trascina" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5" />
        </button>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-forest)] text-sm font-bold text-white">
          {index + 1}
        </span>
        <strong className="flex-1">{stop.name || `Tappa ${index + 1}`}</strong>
        <span className="text-sm text-[var(--color-mute)]">{stop.nights || 0} notti</span>
        <button type="button" className="btn-ghost" onClick={onToggle} aria-expanded={expanded} aria-controls={`stop-fields-${stop.key}`}>
          {expanded ? 'Riduci' : 'Espandi'}
        </button>
        <button type="button" className="btn-ghost" onClick={onUp}>
          Su
        </button>
        <button type="button" className="btn-ghost" onClick={onDown}>
          Giù
        </button>
        <button type="button" className="btn-ghost text-red-800" onClick={onRemove} aria-label="Elimina tappa">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div id={`stop-fields-${stop.key}`} hidden={!expanded} className={expanded ? 'mt-3 grid gap-3 md:grid-cols-2' : 'hidden'}>
        {previousStop && previousStop.name && stop.name ? <div className="md:col-span-2 text-sm">
          <a className="btn-ghost" href={rome2rioUrl(previousStop, stop, country)} target="_blank" rel="noopener noreferrer">{previousStop.name} → {stop.name} · Dettaglio su Rome2Rio ↗</a>
          <p className="mt-1 text-[var(--color-mute)]">Consulta il percorso e inserisci qui sotto durata, distanza e mezzo.</p>
        </div> : null}
        <Field label="Nome" value={stop.name} onChange={(v) => onChange({ name: v })} required />
        <Field label="Paese" value={stop.country || ''} onChange={(v) => onChange({ country: v })} />
        <Field label="Giorno / date" value={stop.arrival_day || ''} onChange={(v) => onChange({ arrival_day: v })} />
        <label className="block text-sm font-semibold">
          Notti
          <input
            className="field mt-1"
            type="number"
            min={0}
            max={30}
            value={stop.nights ?? 0}
            onChange={(e) => onChange({ nights: Number(e.target.value) })}
          />
        </label>
        <Field label="Latitudine" value={stop.latitude?.toString() || ''} onChange={(v) => onChange({ latitude: v ? Number(v) : null })} />
        <Field label="Longitudine" value={stop.longitude?.toString() || ''} onChange={(v) => onChange({ longitude: v ? Number(v) : null })} />
        <Field label="Minuti di trasferimento" value={stop.transfer_minutes?.toString() || ''} onChange={(v) => onChange({ transfer_minutes: v ? Number(v) : null })} />
        <Field label="Distanza km" value={stop.transfer_distance_km?.toString() || ''} onChange={(v) => onChange({ transfer_distance_km: v ? Number(v) : null })} />
        <Field label="Mezzo consigliato" value={stop.transfer_mode || ''} onChange={(v) => onChange({ transfer_mode: v })} />
        <Field label="Immagine (indirizzo web)" value={stop.image_url || ''} onChange={(v) => onChange({ image_url: v || null })} />
        <Field label="Video preferito (indirizzo YouTube)" value={stop.video_url || ''} onChange={(v) => onChange({ video_url: v || null })} />
        <label className="md:col-span-2 block text-sm font-semibold">
          Descrizione
          <textarea className="field mt-1 min-h-20" value={stop.description || ''} onChange={(e) => onChange({ description: e.target.value })} />
        </label>
        <label className="block text-sm font-semibold">
          Perché visitarla
          <textarea className="field mt-1 min-h-16" value={stop.why_visit || ''} onChange={(e) => onChange({ why_visit: e.target.value })} />
        </label>
        <label className="block text-sm font-semibold">
          Attrazioni
          <textarea className="field mt-1 min-h-16" value={stop.attractions || ''} onChange={(e) => onChange({ attractions: e.target.value })} />
        </label>
        <label className="block text-sm font-semibold">
          Cibi locali
          <textarea className="field mt-1 min-h-16" value={stop.food_notes || ''} onChange={(e) => onChange({ food_notes: e.target.value })} />
        </label>
        <label className="block text-sm font-semibold">
          Mercati
          <textarea className="field mt-1 min-h-16" value={stop.markets || ''} onChange={(e) => onChange({ markets: e.target.value })} />
        </label>
        <label className="block text-sm font-semibold">
          Dove mangiare locale
          <textarea className="field mt-1 min-h-16" value={stop.where_to_eat || ''} onChange={(e) => onChange({ where_to_eat: e.target.value })} />
        </label>
        <label className="block text-sm font-semibold">
          Dove dormire
          <textarea className="field mt-1 min-h-16" value={stop.where_to_stay || ''} onChange={(e) => onChange({ where_to_stay: e.target.value })} />
        </label>
        <label className="block text-sm font-semibold">
          Spiagge
          <textarea className="field mt-1 min-h-16" value={stop.beaches || ''} onChange={(e) => onChange({ beaches: e.target.value })} />
        </label>
        <label className="block text-sm font-semibold">
          Escursioni
          <textarea className="field mt-1 min-h-16" value={stop.excursions || ''} onChange={(e) => onChange({ excursions: e.target.value })} />
        </label>
      </div>
    </div>
  )
}
