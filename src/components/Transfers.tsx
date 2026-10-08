import { useState } from 'react'
import type { Stop } from '../../shared/types'
import { rome2rioUrl } from '../../shared/transfers'
import { api } from '../lib/api'
import { formatTransfer } from '../lib/format'

export function Transfers({ stops, country, onUpdate }: { stops: Stop[]; country: string; onUpdate: (stop: Stop) => void }) {
  if (stops.length < 2) return null
  return (
    <section className="card space-y-3 p-4">
      <h2 className="font-display text-2xl">Spostamenti · Rome2Rio</h2>
      <p className="text-sm text-[var(--color-mute)]">Apri il percorso su Rome2Rio e annota qui durata, distanza e mezzo scelto. I tempi sono inseriti manualmente.</p>
      {stops.slice(1).map((stop, index) => <TransferRow key={`${stops[index].id}-${stop.id}`} from={stops[index]} to={stop} country={country} onUpdate={onUpdate} />)}
    </section>
  )
}

function TransferRow({ from, to, country, onUpdate }: { from: Stop; to: Stop; country: string; onUpdate: (stop: Stop) => void }) {
  const [editing, setEditing] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [mode, setMode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      onUpdate(await api.updateTransfer(to.id, { transfer_minutes: minutes === '' ? null : Number(minutes), transfer_distance_km: distance === '' ? null : Number(distance), transfer_mode: mode }))
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito')
    } finally { setBusy(false) }
  }
  return (
    <div className="rounded-2xl border border-[var(--color-line)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-bold">{from.name} → {to.name}</h3><p className="text-sm">{formatTransfer(to.transfer_minutes, to.transfer_mode) || 'Tempo da inserire'}{to.transfer_distance_km != null ? ` · ${to.transfer_distance_km} km` : ''}</p></div>
        <div className="flex flex-wrap gap-2">
          <a className="btn-ghost" href={rome2rioUrl(from, to, country)} target="_blank" rel="noopener noreferrer">Dettaglio su Rome2Rio ↗</a>
          <button type="button" className="btn-ghost" aria-expanded={editing} onClick={() => { setMinutes(to.transfer_minutes?.toString() || ''); setDistance(to.transfer_distance_km?.toString() || ''); setMode(to.transfer_mode); setError(''); setEditing(!editing) }}>Annota tempo</button>
        </div>
      </div>
      {editing ? <form onSubmit={(e) => void save(e)} className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold">Durata (minuti)<input className="field mt-1" type="number" min={0} max={4320} step={1} value={minutes} disabled={busy} onChange={(e) => setMinutes(e.target.value)} /></label>
        <label className="text-sm font-semibold">Distanza (km)<input className="field mt-1" type="number" min={0} max={20000} step={0.1} value={distance} disabled={busy} onChange={(e) => setDistance(e.target.value)} /></label>
        <label className="text-sm font-semibold">Mezzo<input className="field mt-1" value={mode} maxLength={40} disabled={busy} onChange={(e) => setMode(e.target.value)} /></label>
        {error ? <p role="alert" className="text-sm text-red-700 sm:col-span-3">{error}</p> : null}
        <div className="flex gap-2 sm:col-span-3"><button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva tempo'}</button><button type="button" className="btn-ghost" disabled={busy} onClick={() => setEditing(false)}>Annulla</button></div>
      </form> : null}
    </div>
  )
}
