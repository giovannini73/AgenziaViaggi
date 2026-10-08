import { ArrowLeft, Heart, Search } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { SearchImage, StopNoteItem, YoutubeVideo } from '../../shared/types'
import { api } from '../lib/api'
import {
  browserLocale,
  youtubeEmbedUrl,
  youtubeIdFromUrl,
  youtubeResultsUrl,
  youtubeWatchUrl,
} from '../lib/format'
import { StopNotes } from './StopNotes'

type Kind = 'maps' | 'images' | 'videos'

type Props = {
  open: boolean
  kind: Kind
  title: string
  embedUrl?: string
  videoQuery?: string
  imageQuery?: string
  openUrl: string
  favoriteImageUrl?: string | null
  favoriteVideoUrl?: string | null
  notes?: StopNoteItem[]
  myId?: string
  onAddNote?: (body: string, videoId?: string | null) => Promise<void>
  onDeleteNote?: (id: string) => Promise<void>
  onFavorite?: (kind: 'image' | 'video', url: string | null) => Promise<void>
  onClose: () => void
}

const LABELS: Record<Kind, string> = {
  maps: 'Mappa',
  images: 'Immagini',
  videos: 'Video',
}

export function MediaPopup({
  open,
  kind,
  title,
  embedUrl,
  videoQuery,
  imageQuery,
  openUrl,
  favoriteImageUrl,
  favoriteVideoUrl,
  notes,
  myId,
  onAddNote,
  onDeleteNote,
  onFavorite,
  onClose,
}: Props) {
  const [videoOpenUrl, setVideoOpenUrl] = useState(openUrl)
  useEffect(() => {
    setVideoOpenUrl(openUrl)
  }, [openUrl, open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-popup-title"
        className={`flex h-[min(94vh,860px)] w-full flex-col overflow-hidden rounded-3xl bg-[var(--color-paper)] shadow-2xl ${
          kind === 'videos' && onAddNote ? 'max-w-6xl' : 'max-w-4xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-[var(--color-line)] px-4 py-3">
          <button type="button" className="btn-ghost shrink-0 gap-2" onClick={onClose}>
            <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
            Indietro
          </button>
          <h2 id="media-popup-title" className="min-w-0 flex-1 truncate font-display text-xl">
            {LABELS[kind]} · {title}
          </h2>
        </header>
        {kind === 'videos' && videoQuery ? (
          <YoutubePanel
            query={videoQuery}
            favoriteUrl={favoriteVideoUrl}
            onFavorite={onFavorite}
            onOpenUrlChange={setVideoOpenUrl}
            notes={notes}
            myId={myId}
            onAddNote={onAddNote}
            onDeleteNote={onDeleteNote}
          />
        ) : kind === 'images' && imageQuery ? (
          <ImagesPanel query={imageQuery} favoriteUrl={favoriteImageUrl} onFavorite={onFavorite} />
        ) : (
          <iframe
            title={`${LABELS[kind]} ${title}`}
            src={embedUrl}
            className="min-h-0 w-full flex-1 border-0 bg-white"
            allow="fullscreen; geolocation; encrypted-media"
            allowFullScreen
          />
        )}
        <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] px-4 py-3">
          <button type="button" className="btn-ghost gap-2" onClick={onClose}>
            <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
            Indietro
          </button>
          <a className="btn-ghost" href={kind === 'videos' ? videoOpenUrl : openUrl} target="_blank" rel="noopener noreferrer">
            Apri a schermo intero
          </a>
        </footer>
      </div>
    </div>
  )
}

function PreferitoButton({ active, busy, onClick }: { active: boolean; busy?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow ${
        active ? 'bg-[var(--color-clay)] text-white' : 'bg-white/95 text-[var(--color-ink)]'
      }`}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <Heart className="h-4 w-4" fill={active ? 'currentColor' : 'none'} aria-hidden />
      Preferito
    </button>
  )
}

function YoutubePanel({
  query: initialQuery,
  favoriteUrl,
  onFavorite,
  onOpenUrlChange,
  notes,
  myId,
  onAddNote,
  onDeleteNote,
}: {
  query: string
  favoriteUrl?: string | null
  onFavorite?: (kind: 'image' | 'video', url: string | null) => Promise<void>
  onOpenUrlChange?: (url: string) => void
  notes?: StopNoteItem[]
  myId?: string
  onAddNote?: (body: string, videoId?: string | null) => Promise<void>
  onDeleteNote?: (id: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(initialQuery)
  const [activeQuery, setActiveQuery] = useState(initialQuery)
  const [searchTick, setSearchTick] = useState(0)
  const [videos, setVideos] = useState<YoutubeVideo[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const favoriteId = youtubeIdFromUrl(favoriteUrl)

  useEffect(() => {
    setDraft(initialQuery)
    setActiveQuery(initialQuery)
    setSearchTick(0)
  }, [initialQuery])

  useEffect(() => {
    onOpenUrlChange?.(youtubeResultsUrl(activeQuery))
  }, [activeQuery, onOpenUrlChange])

  useEffect(() => {
    let cancelled = false
    const pasted = /youtube\.com|youtu\.be/i.test(activeQuery) ? youtubeIdFromUrl(activeQuery) : null
    setLoading(true)
    setError('')
    setVideos([])
    setSelected(0)
    if (pasted) {
      setVideos([{ id: pasted, title: 'Video scelto' }])
      setLoading(false)
      return
    }
    void api
      .searchVideos(activeQuery, browserLocale())
      .then((data) => {
        if (cancelled) return
        setVideos(data.videos)
        if (!data.videos.length) setError('Nessun video trovato. Prova un’altra ricerca o aprilo su YouTube.')
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Non è stato possibile mostrare il video qui. Aprilo su YouTube.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeQuery, searchTick])

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const next = draft.trim()
    if (next.length < 2) {
      setError('Scrivi almeno due caratteri oppure incolla un indirizzo YouTube.')
      return
    }
    setActiveQuery(next)
    setSearchTick((n) => n + 1)
  }

  const list =
    favoriteId && !videos.some((video) => video.id === favoriteId)
      ? [{ id: favoriteId, title: 'Video preferito' }, ...videos]
      : videos
  const current = list[Math.min(selected, Math.max(list.length - 1, 0))]

  async function toggleFavorite(id: string) {
    if (!onFavorite) return
    setBusyId(id)
    try {
      await onFavorite('video', favoriteId === id ? null : youtubeWatchUrl(id))
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-black md:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <form
        className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2"
        onSubmit={onSearch}
      >
        <input
          className="field min-w-0 flex-1"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Cerca su YouTube o incolla un indirizzo"
          autoComplete="off"
          aria-label="Cerca su YouTube"
        />
        <button className="btn-primary shrink-0 gap-1" type="submit" disabled={loading}>
          <Search className="h-4 w-4" aria-hidden />
          Cerca
        </button>
      </form>
      {loading ? (
        <p className="grid flex-1 place-items-center px-4 text-center text-white">Cerco i video…</p>
      ) : current ? (
        <div className="relative min-h-0 flex-1">
          <iframe
            title={current.title || 'Video YouTube'}
            src={youtubeEmbedUrl(current.id)}
            className="h-full w-full border-0 bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          {onFavorite ? (
            <div className="absolute right-3 top-3">
              <PreferitoButton active={favoriteId === current.id} busy={busyId === current.id} onClick={() => void toggleFavorite(current.id)} />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="grid flex-1 place-items-center px-4 text-center text-white">{error}</p>
      )}
      {list.length ? (
        <div className="flex gap-2 overflow-x-auto bg-[var(--color-ink)] px-3 py-2">
          {list.map((video, index) => (
            <div key={video.id} className="relative shrink-0">
              <button
                type="button"
                className={`overflow-hidden rounded-lg ${index === selected ? 'ring-2 ring-white' : 'opacity-80'}`}
                onClick={() => setSelected(index)}
                title={video.title}
              >
                <img
                  src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                  alt={video.title || `Video ${index + 1}`}
                  className="h-16 w-24 object-cover md:h-24 md:w-36"
                />
              </button>
              {onFavorite ? (
                <div className="absolute bottom-1 left-1">
                  <PreferitoButton active={favoriteId === video.id} busy={busyId === video.id} onClick={() => void toggleFavorite(video.id)} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      </div>
      {onAddNote ? (
        <aside className="flex h-[42%] min-h-[11rem] w-full shrink-0 flex-col border-t border-[var(--color-line)] bg-[var(--color-paper)] md:h-auto md:w-80 md:border-t-0 md:border-l">
          <StopNotes
            notes={notes || []}
            compact
            currentVideoId={current?.id}
            myId={myId}
            onAdd={onAddNote}
            onDelete={onDeleteNote}
          />
        </aside>
      ) : null}
    </div>
  )
}

function ImagesPanel({
  query,
  favoriteUrl,
  onFavorite,
}: {
  query: string
  favoriteUrl?: string | null
  onFavorite?: (kind: 'image' | 'video', url: string | null) => Promise<void>
}) {
  const [images, setImages] = useState<SearchImage[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyUrl, setBusyUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setImages([])
    setSelected(0)
    void api
      .searchImages(query)
      .then((data) => {
        if (cancelled) return
        setImages(data.images)
        if (!data.images.length) setError('Nessuna immagine trovata. Aprila su Google.')
      })
      .catch(() => {
        if (!cancelled) setError('Non è stato possibile mostrare le immagini qui. Aprilo su Google.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  async function toggleFavorite(url: string) {
    if (!onFavorite) return
    setBusyUrl(url)
    try {
      await onFavorite('image', favoriteUrl === url ? null : url)
    } finally {
      setBusyUrl('')
    }
  }

  const list =
    favoriteUrl && !images.some((image) => image.url === favoriteUrl)
      ? [{ url: favoriteUrl, thumb: favoriteUrl, title: 'Foto preferita' }, ...images]
      : images
  const current = list[Math.min(selected, Math.max(list.length - 1, 0))]

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-black">
      {loading ? (
        <p className="grid flex-1 place-items-center px-4 text-center text-white">Cerco le immagini…</p>
      ) : current ? (
        <div className="relative min-h-0 flex-1">
          <img src={current.url} alt={current.title || 'Immagine'} className="h-full w-full object-contain bg-black" />
          {onFavorite ? (
            <div className="absolute right-3 top-3">
              <PreferitoButton active={favoriteUrl === current.url} busy={busyUrl === current.url} onClick={() => void toggleFavorite(current.url)} />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="grid flex-1 place-items-center px-4 text-center text-white">{error}</p>
      )}
      {list.length ? (
        <div className="flex gap-2 overflow-x-auto bg-[var(--color-ink)] px-3 py-2">
          {list.map((image, index) => (
            <div key={image.url} className="relative shrink-0">
              <button
                type="button"
                className={`overflow-hidden rounded-lg ${index === selected ? 'ring-2 ring-white' : 'opacity-80'}`}
                onClick={() => setSelected(index)}
                title={image.title}
              >
                <img src={image.thumb} alt={image.title || `Immagine ${index + 1}`} className="h-24 w-36 object-cover" />
              </button>
              {onFavorite ? (
                <div className="absolute bottom-1 left-1">
                  <PreferitoButton active={favoriteUrl === image.url} busy={busyUrl === image.url} onClick={() => void toggleFavorite(image.url)} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
