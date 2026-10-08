import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Stop } from '../../shared/types'
import { useSession } from '../lib/session'
import { UserVotes } from './UserVotes'

type Props = {
  stops: Stop[]
  value: number
  onChange: (index: number) => void
  onSeen: (stop: Stop, seen: boolean) => void
}

export function StopCombobox({ stops, value, onChange, onSeen }: Props) {
  const me = useSession()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = stops[Math.min(Math.max(value, 0), Math.max(stops.length - 1, 0))]

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    document.getElementById(`tappa-opzione-${value}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, value])

  if (!current) return null

  function pick(index: number) {
    onChange(index)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative hidden max-md:portrait:!block phone-land:!hidden">
      <div className="flex w-full items-start gap-2 rounded-2xl border border-[var(--color-line)] bg-white px-3 py-2.5">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Scegli una tappa"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="block truncate text-sm font-bold">
            {current.position}. {current.name}
          </span>
        </button>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-[var(--color-mute)] transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </div>
      <div className="mt-1 px-1 text-[var(--color-mute)]">
        <UserVotes
          votes={current.votes}
          myId={me?.id}
          layout="row"
          showSeen
          onSeen={(seen) => onSeen(current, seen)}
        />
      </div>
      {open ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-[min(50vh,22rem)] w-full overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-1.5 shadow-lg"
        >
          {stops.map((stop, i) => (
            <li key={stop.id} id={`tappa-opzione-${i}`} role="option" aria-selected={i === value}>
              <div
                className={`rounded-2xl px-3 py-2.5 ${
                  i === value
                    ? 'bg-[var(--color-forest)] text-white [&_.star-on]:text-[#f4e4c8] [&_.star-off]:text-white/35'
                    : 'bg-white'
                }`}
              >
                <button type="button" className="block w-full truncate text-left text-sm font-bold" onClick={() => pick(i)}>
                  {stop.position}. {stop.name}
                </button>
                <div className={`mt-1 ${i === value ? 'text-white/90' : 'text-[var(--color-mute)]'}`}>
                  <UserVotes
                    votes={stop.votes}
                    myId={me?.id}
                    layout="row"
                    showSeen
                    onSeen={(seen) => onSeen(stop, seen)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
