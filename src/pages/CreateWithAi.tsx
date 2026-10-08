import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TRAVEL_TAGS, type AiProposal } from '../../shared/types'
import { openAiChat } from '../components/AiChat'
import { api } from '../lib/api'
import { TAG_LABELS } from '../lib/format'

const RHYTHMS = ['lento', 'equilibrato', 'pieno ma senza corse']

export function CreateWithAi() {
  const navigate = useNavigate()
  const [country, setCountry] = useState('')
  const [startCity, setStartCity] = useState('')
  const [endCity, setEndCity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rhythm, setRhythm] = useState('equilibrato')
  const [priorities, setPriorities] = useState('')
  const [budget, setBudget] = useState('contenuto, niente lusso')
  const [prompt, setPrompt] = useState('')
  const [prefs, setPrefs] = useState<string[]>(['cultura', 'cibo', 'vita-locale'])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [proposal, setProposal] = useState<AiProposal | null>(null)
  const [applying, setApplying] = useState(false)

  function toggle(tag: string) {
    setPrefs((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setProposal(null)
    try {
      const res = await api.aiCreate({
        country,
        start_city: startCity,
        end_city: endCity,
        start_date: startDate,
        end_date: endDate,
        rhythm,
        priorities,
        budget,
        prompt,
        preferences: prefs,
        locale: navigator.language,
      })
      setProposal(res.proposal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creazione non riuscita')
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    if (!proposal?.itinerary) return
    setApplying(true)
    try {
      const created = await api.aiApplyCreate(proposal.itinerary)
      navigate(`/itinerario/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-clay)]">Crea con AI</p>
        <h1 className="font-display text-4xl">Racconta il viaggio, poi scegli se tenerlo</h1>
        <p className="max-w-2xl text-[var(--color-mute)]">
          La proposta resta una bozza. Solo se premi «Applica modifiche» viene salvata nella raccolta.
        </p>
      </section>

      <form onSubmit={generate} className="card grid gap-3 p-4 md:grid-cols-2">
        <label className="block text-sm font-semibold">
          Paese / area
          <input className="field mt-1" value={country} onChange={(e) => setCountry(e.target.value)} required placeholder="India del Sud, Vietnam…" />
        </label>
        <label className="block text-sm font-semibold">
          Ritmo
          <select className="field mt-1" value={rhythm} onChange={(e) => setRhythm(e.target.value)}>
            {RHYTHMS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Città di partenza
          <input className="field mt-1" value={startCity} onChange={(e) => setStartCity(e.target.value)} required />
        </label>
        <label className="block text-sm font-semibold">
          Città di arrivo
          <input className="field mt-1" value={endCity} onChange={(e) => setEndCity(e.target.value)} required />
        </label>
        <label className="block text-sm font-semibold">
          Data partenza
          <input className="field mt-1" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold">
          Data ritorno
          <input className="field mt-1" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold">
          Priorità
          <input className="field mt-1" value={priorities} onChange={(e) => setPriorities(e.target.value)} placeholder="Mare, templi, cibo locale…" />
        </label>
        <label className="block text-sm font-semibold">
          Budget indicativo
          <input className="field mt-1" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </label>
        <div className="md:col-span-2 flex flex-wrap gap-2">
          {TRAVEL_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${prefs.includes(tag) ? 'bg-[var(--color-forest)] text-white' : 'bg-[var(--color-sand)]'}`}
            >
              {TAG_LABELS[tag]}
            </button>
          ))}
        </div>
        <label className="md:col-span-2 block text-sm font-semibold">
          Descrivi il viaggio che vuoi
          <textarea
            className="field mt-1 min-h-28"
            required
            maxLength={4000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Viaggio in India del Sud, partenza e ritorno Bangalore, dal 27 dicembre al 15 gennaio, almeno due notti per tappa, mare bello, niente lusso…"
          />
        </label>
        {error ? <p className="md:col-span-2 text-red-700">{error}</p> : null}
        <div className="md:col-span-2 flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy} type="submit">
            {busy ? 'Sto preparando l’itinerario…' : 'Genera proposta'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => openAiChat()}>
            Apri la chat
          </button>
        </div>
      </form>

      {proposal ? (
        <section className="card space-y-3 p-4">
          <h2 className="font-display text-2xl">{proposal.summary || proposal.itinerary?.title || 'Proposta'}</h2>
          <p className="whitespace-pre-wrap leading-relaxed">{proposal.message}</p>
          {proposal.changes.length ? (
            <ul className="list-disc pl-5">
              {proposal.changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : null}
          {proposal.itinerary?.stops?.length ? (
            <ol className="space-y-1 text-sm">
              {proposal.itinerary.stops.map((s, i) => (
                <li key={`${s.name}-${i}`}>
                  {i + 1}. {s.name} · {s.nights} notti
                </li>
              ))}
            </ol>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={applying || !proposal.itinerary} onClick={() => void apply()}>
              {applying ? 'Salvataggio…' : 'Applica modifiche'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setProposal(null)}>
              Annulla
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
