import type { UserVote } from '../../shared/types'
import { fillVotes } from '../../shared/types'
import { StarRating } from './StarRating'

type Props = {
  votes: UserVote[] | undefined
  myId?: string
  onRate?: (rating: number) => void
  onSeen?: (seen: boolean) => void
  showSeen?: boolean
  compact?: boolean
  layout?: 'stack' | 'row'
}

export function UserVotes({
  votes,
  myId,
  onRate,
  onSeen,
  showSeen = false,
  compact = false,
  layout = 'stack',
}: Props) {
  const list = votes?.length ? votes : fillVotes([])
  const row = layout === 'row'

  return (
    <div className={row ? 'flex flex-wrap items-center gap-x-3 gap-y-0.5' : compact ? 'space-y-1' : 'space-y-3'}>
      {list.map((vote) => {
        const mine = Boolean(myId && vote.user_id === myId)
        const canVote = Boolean(onRate && mine)
        const canSeen = Boolean(showSeen && onSeen && mine)
        return (
          <div key={vote.user_id} className="flex flex-wrap items-center gap-1.5">
            <span
              className={
                row || compact
                  ? 'text-[11px] font-bold tracking-wide'
                  : 'min-w-24 text-sm font-semibold'
              }
            >
              {vote.name}
              {mine && !row ? ' (tu)' : ''}
            </span>
            <StarRating
              value={vote.rating || 0}
              interactive={canVote}
              onRate={onRate}
              size={row ? 'xs' : 'sm'}
              hideLabel
            />
            {showSeen ? (
              <SeenFlag seen={vote.seen} canToggle={canSeen} compact={row || compact} onToggle={onSeen} />
            ) : null}
            {vote.rating == null && !canVote && !row && !showSeen ? (
              <span className="text-xs text-[var(--color-mute)]">non ha votato</span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function SeenFlag({
  seen,
  canToggle,
  compact,
  onToggle,
}: {
  seen: boolean
  canToggle: boolean
  compact: boolean
  onToggle?: (seen: boolean) => void
}) {
  const cls = compact
    ? 'inline-flex min-h-8 items-center rounded-full px-2 text-[11px] font-bold leading-none'
    : 'inline-flex min-h-9 items-center rounded-full px-3 text-xs font-bold'
  const on = seen
    ? 'bg-[var(--color-forest)] text-white'
    : 'border border-[var(--color-line)] bg-white text-[var(--color-ink)]'
  const label = seen ? 'Visto' : 'Da vedere'

  if (canToggle && onToggle) {
    return (
      <button
        type="button"
        className={`${cls} ${on} cursor-pointer`}
        aria-pressed={seen}
        aria-label={seen ? 'Segnata come vista. Tocca per togliere.' : 'Segna questa tappa come vista'}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onToggle(!seen)
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {label}
      </button>
    )
  }

  return <span className={`${cls} ${on} opacity-80`}>{label}</span>
}
