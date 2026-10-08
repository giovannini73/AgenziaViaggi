import type { StopInput } from './types'

export function totalNights(stops: Pick<StopInput, 'nights'>[]): number {
  return stops.reduce((sum, stop) => sum + Math.max(0, Math.trunc(stop.nights || 0)), 0)
}

export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

// Calendar arithmetic in UTC keeps dates stable across daylight saving changes.
export function addDays(start: string | null | undefined, days: number): string | null {
  if (!start || !isDateOnly(start)) return null
  const date = new Date(`${start}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function arrivalDate(start: string | null | undefined, stops: Pick<StopInput, 'nights'>[]): string | null {
  return stops.length ? addDays(start, totalNights(stops)) : null
}
