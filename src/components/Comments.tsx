import { useEffect, useState } from 'react'
import type { CommentItem } from '../../shared/types'
import { StarRating } from './StarRating'

type Props = {
  comments: CommentItem[]
  defaultAuthor?: string
  onPublish: (payload: { author_name: string; comment: string; rating: number | null }) => Promise<void>
}

export function Comments({ comments, onPublish, defaultAuthor = '' }: Props) {
  const [author, setAuthor] = useState(defaultAuthor)
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (defaultAuthor) setAuthor(defaultAuthor)
  }, [defaultAuthor])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onPublish({ author_name: author || defaultAuthor, comment, rating })
      setComment('')
      setRating(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Non è stato possibile pubblicare')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      <form onSubmit={submit} className="card space-y-3 p-4">
        {defaultAuthor ? (
          <p className="text-sm font-semibold">Commento come {defaultAuthor}</p>
        ) : (
          <label className="block text-sm font-semibold">
            Nome (facoltativo)
            <input
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={80}
              placeholder="Viaggiatore"
            />
          </label>
        )}
        <label className="block text-sm font-semibold">
          Commento
          <textarea
            className="mt-1 min-h-24 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            required
            placeholder="Cosa ne pensi di questa tappa o di questo viaggio?"
          />
        </label>
        <div>
          <div className="mb-1 text-sm font-semibold">Voto associato (facoltativo)</div>
          <StarRating value={rating || 0} interactive onRate={setRating} />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Pubblicazione…' : 'Pubblica commento'}
        </button>
      </form>
      <ul className="space-y-3">
        {comments.length === 0 ? (
          <li className="text-sm text-[var(--color-mute)]">Ancora nessun commento. Puoi scrivere il primo.</li>
        ) : (
          comments.map((item) => (
            <li key={item.id} className="rounded-2xl bg-white/80 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{item.author_name || 'Viaggiatore'}</strong>
                <time className="text-xs text-[var(--color-mute)]">
                  {new Date(item.created_at).toLocaleString('it-IT')}
                </time>
              </div>
              {item.rating != null ? <StarRating value={item.rating} size="sm" /> : null}
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{item.comment}</p>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
