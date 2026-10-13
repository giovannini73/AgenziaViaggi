import type { StopInput } from './types'

export function rome2rioUrl(from: Pick<StopInput, 'name' | 'country'>, to: Pick<StopInput, 'name' | 'country'>, country = ''): string {
  const place = (stop: Pick<StopInput, 'name' | 'country'>) => encodeURIComponent([stop.name.trim(), stop.country || country].filter(Boolean).join(', '))
  return `https://www.rome2rio.com/s/${place(from)}/${place(to)}`
}

export function reconcileTransfers<T extends StopInput & { key: string }>(previous: T[], next: T[]): T[] {
  return next.map((stop, index) => {
    const oldIndex = previous.findIndex((item) => item.key === stop.key)
    const oldOrigin = oldIndex > 0 ? previous[oldIndex - 1].key : null
    const origin = index > 0 ? next[index - 1].key : null
    return oldOrigin === origin ? stop : { ...stop, transfer_minutes: null, transfer_distance_km: null, transfer_mode: '', timeline_transfers: [] }
  })
}
