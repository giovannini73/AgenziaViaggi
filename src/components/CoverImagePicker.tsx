import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SearchImage } from '../../shared/types'
import { api } from '../lib/api'

export function CoverImagePicker({ query, onSelect, onClose }: {
  query: string
  onSelect: (url: string) => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState(query)
  const [search, setSearch] = useState({ query, tick: 0 })
  const [images, setImages] = useState<SearchImage[]>([])
  const [selected, setSelected] = useState<SearchImage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const element = dialog.current
    const previousOverflow = document.body.style.overflow
    element?.showModal()
    document.body.style.overflow = 'hidden'
    return () => { element?.close(); document.body.style.overflow = previousOverflow }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setImages([])
    setSelected(null)
    api.searchImages(search.query)
      .then((result) => {
        if (cancelled) return
        setImages(result.images)
        if (!result.images.length) setError('Nessuna immagine trovata. Prova un’altra ricerca.')
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message || 'Ricerca non riuscita. Riprova.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [search])

  return createPortal(
    <dialog ref={dialog} aria-labelledby="cover-picker-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} className="m-auto h-[min(90dvh,800px)] w-[calc(100%-1.5rem)] max-w-4xl rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-0 text-[var(--color-ink)] shadow-2xl backdrop:bg-black/50">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] p-4">
          <h2 id="cover-picker-title" className="font-display text-2xl">Cerca immagine principale</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>Chiudi</button>
        </header>
        <form className="flex gap-2 p-4" onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          const next = draft.trim()
          if (next.length < 2) { setError('Scrivi almeno due caratteri per cercare.'); return }
          setSearch((previous) => ({ query: next, tick: previous.tick + 1 }))
        }}>
          <label className="min-w-0 flex-1"><span className="sr-only">Cerca immagini del viaggio</span><input autoFocus className="field" value={draft} maxLength={200} onChange={(event) => setDraft(event.target.value)} placeholder="Paese, luogo o soggetto" /></label>
          <button type="submit" className="btn-primary">Cerca</button>
        </form>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4" aria-busy={loading}>
          {loading ? <p role="status">Cerco le immagini…</p> : null}
          {error ? <p role="alert" className="mb-3 text-sm text-red-700">{error}</p> : null}
          {selected ? <div className="mb-4 rounded-2xl bg-white p-2"><img src={selected.url} alt={selected.title || 'Anteprima immagine principale'} className="h-56 w-full object-contain" /><p className="mt-2 text-sm">{selected.title}</p></div> : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image, index) => <button key={`${image.url}-${index}`} type="button" aria-pressed={selected?.url === image.url} aria-label={`Anteprima: ${image.title || `Immagine ${index + 1}`}`} onClick={() => setSelected(image)} className={`overflow-hidden rounded-xl border-2 bg-white text-left ${selected?.url === image.url ? 'border-[var(--color-forest)]' : 'border-transparent'}`}>
              <img src={image.thumb || image.url} alt="" loading="lazy" className="h-32 w-full object-cover" />
              <span className="block truncate p-2 text-xs">{image.title || `Immagine ${index + 1}`}</span>
            </button>)}
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] p-4">
          <p className="text-sm text-[var(--color-mute)]">Scegli una foto e premi Seleziona. Verrà salvata con l’itinerario.</p>
          <button type="button" className="btn-primary" disabled={!selected || loading} onClick={() => { if (selected) onSelect(selected.url) }}>Seleziona</button>
        </footer>
      </div>
    </dialog>, document.body,
  )
}
