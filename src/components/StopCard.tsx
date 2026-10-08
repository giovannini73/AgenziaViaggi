import { Car, Heart, Image, MapPin, CirclePlay } from 'lucide-react'
import { useState } from 'react'
import type { Stop, StopNoteItem } from '../../shared/types'
import { voteBadge } from '../../shared/types'
import { rome2rioUrl } from '../../shared/transfers'
import { api } from '../lib/api'
import { useSession } from '../lib/session'
import {
  formatNights,
  formatTransfer,
  imagesUrl,
  mapsEmbedUrl,
  mapsUrl,
  videosSearchQuery,
  videosUrl,
} from '../lib/format'
import { Comments } from './Comments'
import { ExpandBadge } from './ExpandBadge'
import { MediaPopup } from './MediaPopup'
import { StopNotes } from './StopNotes'
import { UserVotes } from './UserVotes'

type MediaKind = 'maps' | 'images' | 'videos'

type Props = {
  stop: Stop
  nextStop?: Stop
  itineraryCountry?: string
  onRate: (rating: number) => Promise<void>
  onSeen: (seen: boolean) => Promise<void>
  onComment: (payload: { author_name: string; comment: string; rating: number | null }) => Promise<void>
  onFavorite?: (stop: Stop) => void
  onNotes?: (notes: StopNoteItem[]) => void
}

export function StopCard({ stop, nextStop, itineraryCountry, onRate, onSeen, onComment, onFavorite, onNotes }: Props) {
  const country = stop.country
  const me = useSession()
  const [media, setMedia] = useState<MediaKind | null>(null)
  const commentCount = stop.comments?.length || 0
  const notes = stop.notes || []

  async function saveFavorite(kind: 'image' | 'video', url: string | null) {
    const updated = await api.favoriteStop(stop.id, kind, url)
    onFavorite?.(updated)
  }

  async function saveNote(body: string, videoId?: string | null) {
    onNotes?.(await api.addStopNote(stop.id, body, videoId))
  }

  async function removeNote(id: string) {
    onNotes?.(await api.deleteStopNote(id))
  }

  return (
    <article id={`tappa-${stop.id}`} className="card overflow-hidden">
      {stop.image_url ? (
        <img src={stop.image_url} alt="" className="h-44 w-full object-cover phone-port:h-28 phone-land:h-24" />
      ) : (
        <div className="h-2 bg-[var(--color-sand)]" />
      )}
      <div className="space-y-3 p-4 phone-port:space-y-2 phone-port:p-3 phone-land:space-y-2 phone-land:p-3">
        <div className="flex gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-forest)] text-sm font-bold text-white">
            {stop.position}
          </span>
          <div>
            <h3 className="font-display text-2xl leading-tight phone-port:text-xl phone-land:text-xl">{stop.name}</h3>
            <p className="text-sm text-[var(--color-mute)]">
              {stop.country}
              {stop.arrival_day ? ` · ${stop.arrival_day}` : ''} · {formatNights(stop.nights)}
            </p>
          </div>
        </div>
        {stop.transfer_minutes != null || stop.transfer_mode ? (
          <p className="text-sm">
            <span className="text-[var(--color-mute)]">Trasferimento precedente: </span>
            {formatTransfer(stop.transfer_minutes, stop.transfer_mode)}
            {stop.transfer_distance_km != null ? ` · circa ${stop.transfer_distance_km} km` : ''}
          </p>
        ) : null}

        {nextStop ? (
          <div className="space-y-1 rounded-2xl bg-[var(--color-paper)] p-3 phone-port:flex phone-port:items-center phone-port:gap-2 phone-port:space-y-0 phone-port:p-0">
            <p className="text-sm font-bold phone-port:hidden">Verso la tappa successiva: {nextStop.name}</p>
            <a className="btn-ghost phone-port:h-[58px] phone-port:w-[58px] phone-port:shrink-0 phone-port:px-0" href={rome2rioUrl(stop, nextStop, itineraryCountry)} target="_blank" rel="noopener noreferrer" title={`Rome2Rio verso ${nextStop.name}`} aria-label={`Calcola spostamento verso ${nextStop.name} su Rome2Rio (apre una nuova scheda)`}><Car className="hidden h-[48px] w-[48px] phone-port:block" aria-hidden /><span className="phone-port:hidden">Calcola spostamento su Rome2Rio ↗</span></a>
            {nextStop.transfer_minutes != null || nextStop.transfer_mode ? <p className="text-sm text-[var(--color-mute)]">Tempo annotato: {formatTransfer(nextStop.transfer_minutes, nextStop.transfer_mode)}</p> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost phone-port:h-[58px] phone-port:w-[58px] phone-port:px-0" title="Google Maps" aria-label="Apri Google Maps" onClick={() => setMedia('maps')}>
            <MapPin className="hidden h-8 w-8 phone-port:block" aria-hidden /><span className="phone-port:hidden">Google Maps</span>
          </button>
          <button type="button" className="btn-ghost relative gap-1 phone-port:h-[58px] phone-port:w-[58px] phone-port:px-0" title="Immagini" aria-label={stop.image_url ? 'Apri immagini · foto preferita presente' : 'Apri immagini'} onClick={() => setMedia('images')}>
            <Image className="hidden h-8 w-8 phone-port:block" aria-hidden /><span className="phone-port:hidden">Immagini</span>
            {stop.image_url ? <Heart className="h-4 w-4 phone-port:absolute phone-port:right-0 phone-port:top-0 phone-port:h-3 phone-port:w-3" fill="currentColor" aria-label="Foto preferita" /> : null}
          </button>
          <button type="button" className="btn-ghost relative gap-1 phone-port:h-[58px] phone-port:w-[58px] phone-port:px-0" title="Video YouTube" aria-label={stop.video_url ? 'Apri video YouTube · video preferito presente' : 'Apri video YouTube'} onClick={() => setMedia('videos')}>
            <CirclePlay className="hidden h-8 w-8 phone-port:block" aria-hidden /><span className="phone-port:hidden">Video YouTube</span>
            {stop.video_url ? <Heart className="h-4 w-4 phone-port:absolute phone-port:right-0 phone-port:top-0 phone-port:h-3 phone-port:w-3" fill="currentColor" aria-label="Video preferito" /> : null}
          </button>
        </div>

        <ExpandBadge label="Nome e dettagli" badge={stop.name} defaultOpen>
          <p className="leading-relaxed">{stop.description}</p>
          <Detail label="Perché andarci" text={stop.why_visit} />
          <Detail label="Attrazioni" text={stop.attractions} />
          <Detail label="Cibi locali" text={stop.food_notes} />
          <Detail label="Mercati" text={stop.markets} />
          <Detail label="Dove mangiare locale" text={stop.where_to_eat} />
          <Detail label="Dove dormire" text={stop.where_to_stay} />
          <Detail label="Spiagge" text={stop.beaches} />
          <Detail label="Escursioni" text={stop.excursions} />
        </ExpandBadge>

        <ExpandBadge label="Voto" badge={voteBadge(stop.votes)}>
          <UserVotes
            votes={stop.votes}
            myId={me?.id}
            showSeen
            onRate={(n) => void onRate(n)}
            onSeen={(seen) => void onSeen(seen)}
          />
        </ExpandBadge>

        <ExpandBadge label="Note" badge={notes.length ? String(notes.length) : '0'}>
          <StopNotes notes={notes} myId={me?.id} onAdd={saveNote} onDelete={removeNote} />
        </ExpandBadge>

        <ExpandBadge label="Commenti" badge={commentCount ? String(commentCount) : '0'}>
          <Comments comments={stop.comments || []} defaultAuthor={me?.name} onPublish={onComment} />
        </ExpandBadge>
      </div>

      <MediaPopup
        open={media === 'maps'}
        kind="maps"
        title={stop.name}
        embedUrl={mapsEmbedUrl(stop.name, country, stop.latitude, stop.longitude)}
        openUrl={mapsUrl(stop.name, country, stop.latitude, stop.longitude)}
        onClose={() => setMedia(null)}
      />
      <MediaPopup
        open={media === 'images'}
        kind="images"
        title={stop.name}
        imageQuery={`${stop.name} ${country}`.trim()}
        openUrl={imagesUrl(stop.name, country)}
        favoriteImageUrl={stop.image_url}
        onFavorite={saveFavorite}
        onClose={() => setMedia(null)}
      />
      <MediaPopup
        open={media === 'videos'}
        kind="videos"
        title={stop.name}
        videoQuery={videosSearchQuery(stop.name, country)}
        openUrl={videosUrl(stop.name, country)}
        favoriteVideoUrl={stop.video_url}
        notes={notes}
        myId={me?.id}
        onAddNote={saveNote}
        onDeleteNote={removeNote}
        onFavorite={saveFavorite}
        onClose={() => setMedia(null)}
      />
    </article>
  )
}

function Detail({ label, text }: { label: string; text: string }) {
  if (!text) return null
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-mute)]">{label}</div>
      <p className="mt-1 leading-relaxed">{text}</p>
    </div>
  )
}
