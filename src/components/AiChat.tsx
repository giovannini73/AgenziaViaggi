import { useEffect, useRef, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import type { AiProposal } from '../../shared/types'
import { api } from '../lib/api'

type ChatLine = {
  id: string
  role: 'user' | 'assistant'
  text: string
  proposal?: AiProposal
}

function locale() {
  return navigator.languages?.[0] || navigator.language || 'it'
}

export function openAiChat(prefill?: string) {
  window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: prefill || '' }))
}

export function AiChat() {
  const match = useMatch('/itinerario/:id')
  const matchEdit = useMatch('/itinerario/:id/modifica')
  const itineraryId = match?.params.id || matchEdit?.params.id || null
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lines, setLines] = useState<ChatLine[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLines([])
    setConversationId(null)
    setError('')
  }, [itineraryId])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const text = (e as CustomEvent<string>).detail
      setOpen(true)
      if (text) setDraft(text)
    }
    window.addEventListener('open-ai-chat', onOpen)
    return () => window.removeEventListener('open-ai-chat', onOpen)
  }, [])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines, open])

  async function send(text = draft) {
    const message = text.trim()
    if (!message || busy) return
    setDraft('')
    setError('')
    setBusy(true)
    setLines((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text: message }])
    try {
      const res = await api.aiChat({
        message,
        itinerary_id: itineraryId,
        conversation_id: conversationId,
        locale: locale(),
      })
      setConversationId(res.conversation_id)
      setLines((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: res.proposal.message, proposal: res.proposal },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat non disponibile')
    } finally {
      setBusy(false)
    }
  }

  async function apply(proposal: AiProposal) {
    if (!proposal.itinerary) return
    setApplying(true)
    setError('')
    try {
      if (proposal.action === 'update_itinerary' && itineraryId) {
        await api.aiApplyUpdate(itineraryId, proposal.itinerary)
        window.dispatchEvent(new Event('itinerary-updated'))
        setLines((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', text: 'Modifiche applicate all’itinerario.' },
        ])
      } else {
        const created = await api.aiApplyCreate(proposal.itinerary)
        navigate(`/itinerario/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Non è stato possibile applicare le modifiche')
    } finally {
      setApplying(false)
    }
  }

  const suggestions = itineraryId
    ? [
        'Rendi questo itinerario più rilassato',
        'Aggiungi due giorni di mare',
        'Metti almeno 3 notti nelle tappe principali',
        'Cerca video delle tappe',
        'Aggiungi posti dove mangiare locale',
      ]
    : [
        'Fammi un itinerario di 20 giorni in Vietnam',
        'Sri Lanka lento, tè e mare',
        'Cerca immagini di Angkor',
      ]

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--color-forest)] px-4 py-3 text-sm font-bold text-white shadow-lg phone:bottom-3 phone:right-3 phone:min-h-10 phone:px-3 phone:py-2"
          onClick={() => setOpen(true)}
          aria-label="Chat AI"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="phone:hidden">Chat AI</span>
        </button>
      ) : null}

      {open ? (
        <aside className="fixed inset-0 z-40 flex justify-end bg-black/25 lg:bg-transparent lg:inset-y-0 lg:left-auto lg:w-[400px]">
          <div className="flex h-full w-full max-w-full flex-col border-l border-[var(--color-line)] bg-[var(--color-paper)] shadow-2xl lg:max-w-[400px]">
            <header className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] px-4 py-3">
              <div>
                <div className="font-display text-xl">Compagno di viaggio</div>
                <p className="text-xs text-[var(--color-mute)]">
                  {itineraryId ? 'Conosce l’itinerario aperto. Le modifiche restano una proposta finché non le applichi.' : 'Può inventare un itinerario, cercare video e immagini, o darti idee.'}
                </p>
              </div>
              <button type="button" className="btn-ghost px-2" onClick={() => setOpen(false)} aria-label="Chiudi chat">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {lines.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--color-mute)]">Prova a chiedere:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button key={s} type="button" className="btn-ghost text-left text-xs" onClick={() => void send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {lines.map((line) => (
                <div
                  key={line.id}
                  className={`rounded-2xl p-3 text-sm leading-relaxed ${
                    line.role === 'user' ? 'ml-8 bg-[var(--color-forest)] text-white' : 'mr-4 bg-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{line.text}</p>
                  {line.proposal?.links?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {line.proposal.links.map((link) => (
                        <a key={link.url + link.label} className="btn-ghost bg-[var(--color-sand)] text-xs" href={link.url} target="_blank" rel="noopener noreferrer">
                          {link.kind === 'videos' ? 'Video' : link.kind === 'images' ? 'Immagini' : link.kind === 'maps' ? 'Mappa' : 'Link'}: {link.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {line.proposal?.itinerary && line.proposal.action !== 'reply' ? (
                    <div className="mt-3 space-y-2 rounded-xl bg-[var(--color-sand)] p-3 text-[var(--color-ink)]">
                      <div className="font-bold">{line.proposal.summary || 'Proposta'}</div>
                      {line.proposal.changes.length ? (
                        <ul className="list-disc pl-4">
                          {line.proposal.changes.map((change) => (
                            <li key={change}>{change}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>
                          {line.proposal.itinerary.stops?.length || 0} tappe · {line.proposal.itinerary.start_city} →{' '}
                          {line.proposal.itinerary.end_city}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn-primary" disabled={applying} onClick={() => void apply(line.proposal!)}>
                          {applying ? 'Applicazione…' : 'Applica modifiche'}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() =>
                            setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, proposal: undefined } : l)))
                          }
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
              {busy ? <p className="text-sm text-[var(--color-mute)]">Sto pensando al viaggio…</p> : null}
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <div ref={bottom} />
            </div>
            <form
              className="border-t border-[var(--color-line)] p-3"
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              <label className="sr-only" htmlFor="ai-draft">
                Messaggio
              </label>
              <textarea
                id="ai-draft"
                className="field min-h-20"
                value={draft}
                maxLength={4000}
                placeholder={itineraryId ? 'Es. Togli Kochi, o fammi tornare il 15…' : 'Descrivi il viaggio che vuoi…'}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button className="btn-primary mt-2 w-full" disabled={busy} type="submit">
                Invia
              </button>
            </form>
          </div>
        </aside>
      ) : null}
    </>
  )
}
