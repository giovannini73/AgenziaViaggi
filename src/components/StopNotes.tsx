import { useState, type FormEvent } from 'react'
import type { StopNoteItem } from '../../shared/types'

type Props = {
  notes: StopNoteItem[]
  compact?: boolean
  currentVideoId?: string | null
  myId?: string
  onAdd: (body: string, videoId?: string | null) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function StopNotes({ notes, compact = false, currentVideoId, myId, onAdd, onDelete }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const body = text.trim()
    if (!body) return
    setError('')
    setBusy(true)
    try {
      await onAdd(body, currentVideoId || null)
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Non è stato possibile salvare')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!onDelete) return
    setBusy(true)
    setError('')
    try {
      await onDelete(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Non è stato possibile cancellare')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={compact ? 'flex min-h-0 flex-1 flex-col' : 'space-y-3'}>
      <form onSubmit={submit} className={compact ? 'shrink-0 space-y-2 p-3' : 'card space-y-2 p-4'}>
        {compact ? <p className="text-sm font-bold">Note mentre guardi</p> : null}
        <textarea
          className={compact ? 'field min-h-20 text-sm' : 'field min-h-24'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          required
          placeholder={compact ? 'Scrivi una nota su questo video…' : 'Una nota su questa tappa…'}
          aria-label="Nota"
        />
        {error ? <p className="text-sm text-[var(--color-clay)]">{error}</p> : null}
        <button className="btn-primary w-full" type="submit" disabled={busy}>
          {busy ? 'Salvo…' : 'Salva nota'}
        </button>
      </form>
      <ul className={compact ? 'min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3' : 'space-y-2'}>
        {notes.length === 0 ? (
          <li className="text-sm text-[var(--color-mute)]">
            {compact ? 'Nessuna nota su questa tappa. Scrivila qui mentre il video gira.' : 'Ancora nessuna nota.'}
          </li>
        ) : (
          notes.map((note) => (
            <li
              key={note.id}
              className={`rounded-2xl bg-white/80 p-3 ${
                compact && currentVideoId && note.video_id === currentVideoId ? 'ring-1 ring-[var(--color-forest)]' : ''
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className="text-sm">{note.author_name || 'Viaggiatore'}</strong>
                <time className="text-[11px] text-[var(--color-mute)]">
                  {new Date(note.created_at).toLocaleString('it-IT')}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{note.body}</p>
              {onDelete && myId && note.user_id === myId ? (
                <button
                  type="button"
                  className="mt-1 text-xs font-semibold text-[var(--color-mute)] underline"
                  disabled={busy}
                  onClick={() => void remove(note.id)}
                >
                  Cancella
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
