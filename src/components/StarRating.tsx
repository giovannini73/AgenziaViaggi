import { useState } from 'react'

type Props = {
  value: number
  count?: number
  interactive?: boolean
  onRate?: (rating: number) => void
  size?: 'xs' | 'sm' | 'md'
  hideLabel?: boolean
}

export function StarRating({
  value,
  count,
  interactive = false,
  onRate,
  size = 'md',
  hideLabel = false,
}: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? Math.round(value)
  const cls = size === 'xs' ? 'text-[13px]' : size === 'sm' ? 'text-lg' : 'text-2xl'
  const label = interactive ? 'Assegna un voto da 0 a 5 stelle' : value ? `Voto medio ${value.toFixed(1)}` : 'Nessun voto'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={`flex ${interactive ? 'gap-1' : 'gap-0.5'}`}
        onMouseLeave={() => setHover(null)}
        role={interactive ? 'group' : 'img'}
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= shown
          const color = filled ? 'text-[var(--color-clay)]' : 'text-[#c8b8a4]'
          const glyph = filled ? '★' : '☆'
          if (!interactive) {
            return (
              <span
                key={n}
                className={`${cls} leading-none ${filled ? 'star-on text-[var(--color-clay)]' : 'star-off text-[#c8b8a4]'}`}
                aria-hidden
              >
                {glyph}
              </span>
            )
          }
          return (
            <button
              key={n}
              type="button"
              className={`${cls} leading-none min-h-11 min-w-11 rounded-full hover:bg-[var(--color-sand)] ${color}`}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onClick={() => onRate?.(n)}
              aria-label={`${n} stell${n === 1 ? 'a' : 'e'}`}
            >
              {glyph}
            </button>
          )
        })}
      </div>
      {hideLabel ? null : (
        <span className="text-sm text-[var(--color-mute)]">
          {count ? value.toFixed(1) : interactive ? '' : '—'}
          {typeof count === 'number' ? ` · ${count} vot${count === 1 ? 'o' : 'i'}` : ''}
        </span>
      )}
    </div>
  )
}
