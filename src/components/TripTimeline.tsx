import type { StopInput, TimelineTransfer } from '../../shared/types'
import { Car, Moon, Truck } from 'lucide-react'
import { useState } from 'react'
import { addDays, totalNights, elapsedDays, transferDays } from '../../shared/schedule'
import { rome2rioUrl } from '../../shared/transfers'
import { formatDate, formatNights } from '../lib/format'

const colors = ['#274638', '#9b5b35', '#426f86', '#80618c', '#73743b']

export function TripTimeline({ stops, startDate, country = '', selectedIndex, onSelect, onNightsChange, onMove, onTransfersChange, busy = false }: {
  stops: (Pick<StopInput, 'name' | 'nights' | 'country' | 'transfer_distance_km' | 'id' | 'timeline_transfers'> & { key?: string })[]
  startDate: string | null
  country?: string
  selectedIndex?: number
  onSelect?: (index: number) => void
  onNightsChange?: (index: number, nights: number) => void
  onMove?: (index: number, direction: -1 | 1) => void
  onTransfersChange?: (index: number, events: TimelineTransfer[]) => void | Promise<void>
  busy?: boolean
}) {
  const nights = totalNights(stops)
  const duration = elapsedDays(stops)
  const sections = stops.map((stop, index) => {
    const transferStart = elapsedDays(stops.slice(0, index))
    const start = transferStart + transferDays([stop])
    const stopNights = totalNights([stop])
    const last = index === stops.length - 1
    return { ...stop, index, start, transferStart, stopNights, last, days: stopNights + (last ? 1 : 0) }
  })

  if (!stops.length) return <p className="text-sm text-[var(--color-mute)]">Aggiungi le tappe per visualizzare i giorni della vacanza.</p>

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--color-mute)]">
        {duration + 1} giorni · {formatNights(nights)}. Il giorno di arrivo è incluso nell'ultima tappa.
      </p>
      <ol className="space-y-2" aria-label="Timeline verticale dei giorni della vacanza">
        {sections.map((stop) => (
          <li key={stop.id || stop.key || stop.index} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[6rem_minmax(0,1fr)] phone:!block">
            <div className="col-span-2">
              <TimelineTransfers events={stop.timeline_transfers || []} from={stops[stop.index - 1]?.name || 'Partenza'} to={stop.name || 'Tappa'} start={stop.transferStart} startDate={startDate} busy={busy} onChange={onTransfersChange ? (events) => onTransfersChange(stop.index, events) : undefined} />
            </div>
            <MobileTimelineStop name={stop.name || 'Tappa'} index={stop.index} start={stop.start} startDate={startDate} nights={stop.stopNights} days={stop.days} last={stop.last} nextName={stops[stop.index + 1]?.name} distance={stops[stop.index + 1]?.transfer_distance_km} url={!stop.last && stop.name && stops[stop.index + 1]?.name ? rome2rioUrl(stop, stops[stop.index + 1], country) : undefined} selected={selectedIndex === stop.index} busy={busy} onSelect={onSelect ? () => onSelect(stop.index) : undefined} onChange={onNightsChange ? (nights) => onNightsChange(stop.index, nights) : undefined} onMove={onMove ? (direction) => onMove(stop.index, direction) : undefined} />
            <div className="flex flex-col border-r-2 border-[var(--color-forest)] phone:!hidden">
              {Array.from({ length: stop.days }, (_, offset) => {
                const day = stop.start + offset
                const date = addDays(startDate, day)
                return (
                  <div key={day} className="relative flex min-h-16 flex-1 flex-col justify-center pr-4 text-right">
                    <span aria-hidden className="absolute right-0 top-1/2 h-px w-3 bg-[var(--color-forest)]" />
                    <span className="text-xs font-bold">Giorno {day + 1}</span>
                    {date ? <time dateTime={date} className="text-xs text-[var(--color-mute)]">{date.slice(8, 10)}/{date.slice(5, 7)}</time> : null}
                  </div>
                )
              })}
              {!stop.days ? <span className="py-4 pr-4 text-right text-xs text-[var(--color-mute)]">Transito</span> : null}
            </div>
              <div
                title={`${stop.name}: ${formatNights(stop.stopNights)}${startDate ? ` · ${formatDate(addDays(startDate, stop.start))} → ${formatDate(addDays(startDate, stop.start + stop.stopNights))}` : ''}`}
                className={`relative flex min-h-28 min-w-0 flex-col justify-center rounded-xl p-3 text-left text-white phone:!hidden ${!stop.last && stop.name && stops[stop.index + 1]?.name ? 'pb-14' : ''}`}
                style={{ background: colors[stop.index % colors.length], outline: selectedIndex === stop.index ? '2px solid var(--color-ink)' : undefined, outlineOffset: 1 }}
              >
                <button type="button" className="w-full min-w-0 py-2 text-left" onClick={() => onSelect?.(stop.index)} aria-pressed={onSelect ? selectedIndex === stop.index : undefined}>
                  <span className="block text-sm font-bold">{stop.index + 1}. {stop.name || 'Tappa'}</span>
                  <span className="text-xs opacity-90">{formatNights(stop.stopNights)}</span>
                {stop.last ? <span className="mt-1 block text-xs opacity-90">Giorno {duration + 1}: arrivo incluso</span> : null}
                </button>
                {onNightsChange ? <NightsControls name={stop.name} nights={stop.stopNights} busy={busy} onChange={(nights) => onNightsChange(stop.index, nights)} /> : null}
                {onMove ? <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="rounded-lg border border-white/50 px-3 py-2 text-xs font-bold disabled:opacity-40" disabled={busy || stop.index === 0} aria-label={`Sposta prima ${stop.name}`} onClick={() => onMove(stop.index, -1)}>↑ Prima</button>
                  <button type="button" className="rounded-lg border border-white/50 px-3 py-2 text-xs font-bold disabled:opacity-40" disabled={busy || stop.last} aria-label={`Sposta dopo ${stop.name}`} onClick={() => onMove(stop.index, 1)}>↓ Dopo</button>
                </div> : null}
                {!stop.last ? <p className="mt-2 text-xs">Distanza verso {stops[stop.index + 1].name || 'la tappa successiva'}: {stops[stop.index + 1].transfer_distance_km != null ? `${stops[stop.index + 1].transfer_distance_km} km` : 'da inserire in Spostamenti'}</p> : null}
                {stops[stop.index + 1]?.name && stop.name ? (
                  <a className="absolute bottom-3 left-3 grid h-9 w-9 place-items-center rounded-lg border border-white/50 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" href={rome2rioUrl(stop, stops[stop.index + 1], country)} target="rome2rio" rel="noopener noreferrer" title={`Calcola lo spostamento verso ${stops[stop.index + 1].name} su Rome2Rio`} aria-label={`Calcola lo spostamento verso ${stops[stop.index + 1].name} su Rome2Rio (apre la finestra Rome2Rio)`}>
                    <Car className="h-5 w-5" aria-hidden />
                  </a>
                ) : null}
              </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function MobileTimelineStop({ name, index, start, startDate, nights, days, last, nextName, distance, url, selected, busy, onSelect, onChange, onMove }: {
  name: string; index: number; start: number; startDate: string | null; nights: number; days: number; last: boolean; nextName?: string; distance?: number | null; url?: string; selected: boolean; busy: boolean
  onSelect?: () => void; onChange?: (nights: number) => void; onMove?: (direction: -1 | 1) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const shortDate = (offset: number) => {
    const date = addDays(startDate, offset)
    return date ? new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : `Giorno ${offset + 1}`
  }
  const color = colors[index % colors.length]
  return <div className="hidden grid-cols-[2rem_minmax(0,1fr)] gap-2 phone:!grid">
    <div className="relative border-r-2 border-[var(--color-line)] pt-6 text-xs text-[var(--color-mute)]">
      <span className="absolute -right-[6px] top-6 h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
      <span className="mt-5 block">G{start + 1}</span>
    </div>
    <div className="min-w-0 rounded-2xl p-3 text-white" style={{ background: color, outline: selected ? '2px solid var(--color-ink)' : undefined, outlineOffset: 1 }}>
      <button type="button" className="block w-full text-left" onClick={onSelect}>
        <span className="block text-base font-bold">{index + 1}. {name}</span>
        <span className="mt-1 block text-xs opacity-90">{shortDate(start)}–{shortDate(start + nights)}</span>
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onChange ? <button type="button" className="grid h-9 w-8 place-items-center rounded-lg bg-white/15 text-lg disabled:opacity-40" disabled={busy || nights <= 1} aria-label={`Riduci notti di ${name}`} onClick={() => onChange(Math.max(1, nights - 1))}>−</button> : null}
          <span className="text-xs font-bold">{formatNights(nights)}</span>
          {onChange ? <button type="button" className="grid h-9 w-8 place-items-center rounded-lg bg-white/15 text-lg disabled:opacity-40" disabled={busy || nights >= 30} aria-label={`Aumenta notti di ${name}`} onClick={() => onChange(Math.max(1, nights + 1))}>+</button> : null}
        </div>
        {onMove ? <div className="flex gap-1">
          <button type="button" className="h-9 w-8 rounded-lg bg-white/15 disabled:opacity-40" disabled={busy || index === 0} aria-label={`Sposta prima ${name}`} title="Sposta prima" onClick={() => onMove(-1)}>↑</button>
          <button type="button" className="h-9 w-8 rounded-lg bg-white/15 disabled:opacity-40" disabled={busy || last} aria-label={`Sposta dopo ${name}`} title="Sposta dopo" onClick={() => onMove(1)}>↓</button>
        </div> : null}
      </div>
      {expanded ? <ul className="mt-2 space-y-1 border-l border-white/40 pl-2 text-xs">
        {Array.from({ length: days }, (_, offset) => <li key={offset}>{shortDate(start + offset)} · Giorno {start + offset + 1}{last && offset === days - 1 ? ' · arrivo' : ''}</li>)}
        {!days ? <li>Transito senza pernottamento</li> : null}
      </ul> : null}
      <div className="mt-2 flex items-center gap-2">
        {url ? <a href={url} target="rome2rio" rel="noopener noreferrer" className="grid h-9 w-8 shrink-0 place-items-center rounded-lg hover:bg-white/15" title={`Rome2Rio verso ${nextName}`} aria-label={`Rome2Rio verso ${nextName} (apre la finestra Rome2Rio)`}><Car className="h-5 w-5" aria-hidden /></a> : null}
        <span className="min-w-0 flex-1 text-xs">{last ? `${shortDate(start + nights)} · arrivo incluso` : distance != null ? `${distance} km alla prossima tappa` : 'Distanza da inserire'}</span>
        <button type="button" className="min-h-9 shrink-0 text-xs" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Riduci ▴' : 'Giorni ▾'}</button>
      </div>
    </div>
  </div>
}

function TimelineTransfers({ events, from, to, start, startDate, busy, onChange }: {
  events: TimelineTransfer[]; from: string; to: string; start: number; startDate: string | null; busy: boolean
  onChange?: (events: TimelineTransfer[]) => void | Promise<void>
}) {
  const [draft, setDraft] = useState<TimelineTransfer | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  let offset = start
  async function save(next: TimelineTransfer[]) {
    if (!onChange || busy || saving) return
    setSaving(true)
    setError('')
    try { await onChange(next); setDraft(null) }
    catch (err) { setError(err instanceof Error ? err.message : 'Salvataggio non riuscito') }
    finally { setSaving(false) }
  }
  const disabled = busy || saving
  return <div className="space-y-2">
    {events.map((event) => {
      const day = offset
      if (event.kind === 'day') offset++
      const date = addDays(startDate, day)
      const Icon = event.kind === 'day' ? Truck : Moon
      return <div key={event.id} className="mx-auto flex w-fit max-w-full items-start gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2">
        <Icon className="mt-1 h-6 w-6 shrink-0 text-[var(--color-forest)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{event.kind === 'day' ? 'Giorno di trasferimento' : 'Trasferta notturna'}</p>
          <p className="text-xs text-[var(--color-mute)]">{from} → {to} · {event.kind === 'day' ? `Giorno ${day + 1}` : 'Senza giorni aggiuntivi'}{date ? ` · ${formatDate(date)}` : ''}</p>
          {event.notes ? <p className="mt-2 whitespace-pre-wrap break-words text-sm">{event.notes}</p> : null}
          {onChange ? <div className="mt-2 flex gap-3 text-xs">
            <button type="button" className="min-h-9 underline" disabled={disabled} onClick={() => { setDraft({ ...event }); setError('') }}>Modifica note</button>
            <button type="button" className="min-h-9 text-red-700 underline" disabled={disabled} onClick={() => void save(events.filter((item) => item.id !== event.id))}>Rimuovi</button>
          </div> : null}
        </div>
      </div>
    })}
    {onChange && !draft && events.length < 30 ? <div className="flex flex-wrap gap-2 py-1">
      <button type="button" className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 text-xs" disabled={disabled} onClick={() => setDraft({ id: crypto.randomUUID(), kind: 'day', notes: '' })}><Truck className="h-4 w-4" aria-hidden />+ Giorno di trasferimento</button>
      <button type="button" className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 text-xs" disabled={disabled} onClick={() => setDraft({ id: crypto.randomUUID(), kind: 'night', notes: '' })}><Moon className="h-4 w-4" aria-hidden />+ Trasferta notturna</button>
    </div> : null}
    {draft ? <div className="rounded-xl border border-[var(--color-line)] p-3">
      <p className="text-sm font-bold">{draft.kind === 'day' ? 'Giorno di trasferimento (+1 giorno)' : 'Trasferta notturna (nessun giorno aggiuntivo)'} · {from} → {to}</p>
      <label className="mt-2 block text-sm">Note del trasferimento
        <textarea className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white p-2" rows={3} maxLength={2000} value={draft.notes} disabled={disabled} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Mezzo, orari, prenotazione…" />
      </label>
      <div className="mt-2 flex gap-2">
        <button type="button" className="min-h-10 rounded-lg bg-[var(--color-forest)] px-3 text-sm text-white" disabled={disabled} onClick={() => void save(events.some((event) => event.id === draft.id) ? events.map((event) => event.id === draft.id ? draft : event) : [...events, draft])}>{saving ? 'Salvataggio…' : 'Salva trasferimento'}</button>
        <button type="button" className="min-h-10 px-3 text-sm" disabled={disabled} onClick={() => setDraft(null)}>Annulla</button>
      </div>
    </div> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
  </div>
}

function NightsControls({ name, nights, busy, onChange }: { name: string; nights: number; busy: boolean; onChange: (nights: number) => void }) {
  return <div className="flex justify-start gap-1 pb-1">
    <button type="button" className="grid h-9 w-7 shrink-0 place-items-center rounded-lg border border-current text-lg font-bold disabled:opacity-40" aria-label={`Riduci notti di ${name}`} disabled={busy || nights <= 1} onClick={() => onChange(Math.max(1, nights - 1))}>−</button>
    <button type="button" className="grid h-9 w-7 shrink-0 place-items-center rounded-lg border border-current text-lg font-bold disabled:opacity-40" aria-label={`Aumenta notti di ${name}`} disabled={busy || nights >= 30} onClick={() => onChange(Math.max(1, nights + 1))}>+</button>
  </div>
}
