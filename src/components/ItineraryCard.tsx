import { Link } from 'react-router-dom'
import type { ItineraryListItem } from '../../shared/types'
import { formatDuration, TAG_LABELS } from '../lib/format'
import { useSession } from '../lib/session'
import { UserVotes } from './UserVotes'

type Props = {
  item: ItineraryListItem
  onDuplicate: (id: string) => void
  duplicating?: boolean
}

export function ItineraryCard({ item, onDuplicate, duplicating }: Props) {
  const me = useSession()
  return (
    <article className="card relative flex flex-col overflow-hidden">
      <Link
        to={`/itinerario/${item.id}`}
        aria-label={`Apri viaggio: ${item.title}`}
        className="absolute inset-0 z-[1] rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--color-forest)]"
      />
      <div className="relative h-44 bg-[var(--color-sand)] phone-port:h-32">
        {item.cover_image ? (
          <img src={item.cover_image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-end p-4 font-display text-2xl text-[var(--color-forest)]">
            {item.country || 'Viaggio'}
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold">
          {item.country}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 phone-port:gap-2 phone-port:p-3">
        <h2 className="font-display text-2xl leading-tight phone-port:text-xl">{item.title}</h2>
        <p className="line-clamp-3 text-sm leading-relaxed text-[var(--color-mute)] phone-port:line-clamp-2">{item.description}</p>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <li>
            <span className="text-[var(--color-mute)]">Durata</span>
            <div className="font-semibold">{formatDuration(item.duration_days, item.duration_nights)}</div>
          </li>
          <li>
            <span className="text-[var(--color-mute)]">Tappe</span>
            <div className="font-semibold">{item.stop_count}</div>
          </li>
          <li>
            <span className="text-[var(--color-mute)]">Partenza</span>
            <div className="font-semibold">{item.start_city || '—'}</div>
          </li>
          <li>
            <span className="text-[var(--color-mute)]">Arrivo</span>
            <div className="font-semibold">{item.end_city || '—'}</div>
          </li>
        </ul>
        <UserVotes votes={item.votes} myId={me?.id} compact />
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[var(--color-sand)] px-2 py-0.5 text-xs font-semibold">
              {TAG_LABELS[tag] || tag}
            </span>
          ))}
        </div>
        <div className="relative z-[2] mt-auto flex flex-wrap gap-2 pt-1">
          <Link to={`/itinerario/${item.id}`} className="btn-primary">
            Apri itinerario
          </Link>
          <Link to={`/itinerario/${item.id}/modifica`} className="btn-ghost">
            Modifica
          </Link>
          <button type="button" className="btn-ghost" disabled={duplicating} onClick={() => onDuplicate(item.id)}>
            Duplica
          </button>
        </div>
      </div>
    </article>
  )
}
