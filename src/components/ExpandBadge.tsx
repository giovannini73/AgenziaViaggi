import { useState } from 'react'

type Props = {
  label: string
  badge?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function ExpandBadge({ label, badge, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-white/70">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left phone-port:min-h-10 phone-port:px-3 phone-port:py-2"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-bold">{label}</span>
        <span className="flex items-center gap-2">
          {badge ? <span className="rounded-full bg-[var(--color-sand)] px-2 py-0.5 text-xs font-semibold">{badge}</span> : null}
          <span aria-hidden className="text-[var(--color-mute)]">
            {open ? '▾' : '▸'}
          </span>
        </span>
      </button>
      {open ? <div className="space-y-3 border-t border-[var(--color-line)] px-4 py-3">{children}</div> : null}
    </div>
  )
}
