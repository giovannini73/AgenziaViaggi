import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { GeoJSON, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import type { GeoJsonObject } from 'geojson'
import L from 'leaflet'
import type { Stop } from '../../shared/types'
import { formatNights } from '../lib/format'
import { useSession } from '../lib/session'
import { UserVotes } from './UserVotes'

const ISO: Record<string, string> = {
  india: 'IND',
  'sri lanka': 'LKA',
  cambogia: 'KHM',
  cambodia: 'KHM',
  filippine: 'PHL',
  philippines: 'PHL',
}

function numberedIcon(n: number, active = false) {
  return L.divIcon({
    className: active ? 'stop-marker stop-marker-active' : 'stop-marker',
    html: `<span>${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

function FocusStop({ point }: { point: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (!point) return
    map.panTo(point)
  }, [map, point])
  return null
}

function ResizeMap({ expanded }: { expanded: boolean }) {
  const map = useMap()
  useEffect(() => {
    const refresh = () => map.invalidateSize()
    window.addEventListener('orientationchange', refresh)
    window.addEventListener('resize', refresh)
    const t = window.setTimeout(refresh, 180)
    return () => {
      window.removeEventListener('orientationchange', refresh)
      window.removeEventListener('resize', refresh)
      window.clearTimeout(t)
    }
  }, [map, expanded])
  return null
}

function FitStops({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) {
      map.setView(points[0], 8)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 8 })
  }, [map, points])
  return null
}

type Props = {
  stops: Stop[]
  country?: string
  className?: string
  selectedIndex?: number
  onSelect?: (index: number) => void
  onSeen?: (stop: Stop, seen: boolean) => void
}

export function TravelMap({ stops, country = '', className = '', selectedIndex, onSelect, onSeen }: Props) {
  const me = useSession()
  const container = useRef<HTMLDivElement>(null)
  const fullscreenButton = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false)
        fullscreenButton.current?.focus()
      }
    }
    window.addEventListener('keydown', escape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', escape)
    }
  }, [expanded])

  useEffect(() => {
    const sync = () => setExpanded(document.fullscreenElement === container.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  async function toggleFullscreen() {
    if (expanded) {
      if (document.fullscreenElement === container.current) await document.exitFullscreen()
      setExpanded(false)
      fullscreenButton.current?.focus()
    } else {
      setExpanded(true)
      try {
        await container.current?.requestFullscreen?.()
      } catch {
        // The fixed overlay also supports browsers without the Fullscreen API.
      }
    }
  }
  const points = useMemo(
    () =>
      stops
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => [s.latitude as number, s.longitude as number] as [number, number]),
    [stops],
  )
  const [border, setBorder] = useState<GeoJsonObject | null>(null)
  const iso = ISO[country.split(',')[0]?.trim().toLowerCase() || '']

  useEffect(() => {
    if (!iso) {
      setBorder(null)
      return
    }
    let cancelled = false
    fetch(`https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries/${iso}.geo.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setBorder(data)
      })
      .catch(() => {
        if (!cancelled) setBorder(null)
      })
    return () => {
      cancelled = true
    }
  }, [iso])

  const selectedPoint =
    selectedIndex != null &&
    stops[selectedIndex]?.latitude != null &&
    stops[selectedIndex]?.longitude != null
      ? ([stops[selectedIndex].latitude as number, stops[selectedIndex].longitude as number] as [number, number])
      : null
  const center = points[0] || ([20, 80] as [number, number])

  return (
    <div ref={container} className={`travel-map overflow-hidden border border-[var(--color-line)] ${expanded ? 'travel-map-expanded' : `relative rounded-3xl phone-land:h-full ${className}`}`}>
      <button ref={fullscreenButton} type="button" onClick={() => void toggleFullscreen()} className="btn-ghost absolute right-3 top-3 z-[500] gap-2 shadow-md" aria-label={expanded ? 'Chiudi mappa a tutto schermo' : 'Mappa a tutto schermo'} aria-pressed={expanded}>
        {expanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        {expanded ? 'Chiudi tutto schermo' : 'Tutto schermo'}
      </button>
      <MapContainer
        center={center}
        zoom={5}
        className="z-0 h-[min(70vh,520px)] w-full phone-port:h-[min(38vh,260px)] phone-land:h-full phone-land:min-h-[220px]"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {border ? (
          <GeoJSON
            data={border}
            style={{ color: '#274638', weight: 1.4, fillColor: '#274638', fillOpacity: 0.08 }}
          />
        ) : null}
        {points.length > 1 ? (
          <Polyline positions={points} pathOptions={{ color: '#9b5b35', weight: 4, dashArray: '8 7' }} />
        ) : null}
        {stops.map((stop, i) =>
          stop.latitude != null && stop.longitude != null ? (
            <Marker
              key={`${stop.id}-${stop.position}-${i === selectedIndex ? 'on' : 'off'}`}
              position={[stop.latitude, stop.longitude]}
              icon={numberedIcon(i + 1, i === selectedIndex)}
              eventHandlers={{ click: () => onSelect?.(i) }}
            >
              <Popup>
                <div className="min-w-40">
                  <div className="font-bold">
                    {i + 1}. {stop.name}
                  </div>
                  <div className="text-sm opacity-70">{formatNights(stop.nights)}</div>
                  <UserVotes
                    votes={stop.votes}
                    compact
                    showSeen
                    myId={me?.id}
                    onSeen={onSeen ? (seen) => onSeen(stop, seen) : undefined}
                  />
                  <p className="mt-1 text-sm leading-snug">{stop.description.slice(0, 180)}</p>
                </div>
              </Popup>
            </Marker>
          ) : null,
        )}
        <FitStops points={points} />
        <FocusStop point={selectedPoint} />
        <ResizeMap expanded={expanded} />
      </MapContainer>
    </div>
  )
}
