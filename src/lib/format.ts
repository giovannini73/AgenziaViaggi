export function formatNights(n: number): string {
  if (n <= 0) return 'transito'
  if (n === 1) return '1 notte'
  return `${n} notti`
}

export function formatDuration(days: number, nights: number): string {
  if (days > 0) return `${days} giorni · ${formatNights(nights)}`
  if (nights > 0) return formatNights(nights)
  return 'durata da definire'
}

export function formatTransfer(minutes: number | null, mode: string): string {
  if (minutes == null && !mode) return ''
  if (minutes == null) return mode
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const time = h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`
  return mode ? `${time} · ${mode}` : time
}

export function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function mapsUrl(name: string, country: string, lat?: number | null, lng?: number | null): string {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${country}`)}`
}

export function imagesUrl(name: string, country: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${name} ${country}`)}`
}

const TRAVEL_WORD: Record<string, string> = {
  it: 'viaggio',
  en: 'travel',
  de: 'Reise',
  fr: 'voyage',
  es: 'viaje',
  pt: 'viagem',
  nl: 'reis',
  pl: 'podróż',
  ja: '旅行',
  ko: '여행',
  ru: 'путешествие',
  ar: 'سفر',
  hi: 'यात्रा',
  zh: '旅行',
  sv: 'resa',
  da: 'rejse',
  nb: 'reise',
  no: 'reise',
  fi: 'matka',
  el: 'ταξίδι',
  tr: 'seyahat',
  cs: 'cestování',
  ro: 'călătorie',
  hu: 'utazás',
  uk: 'подорож',
  id: 'wisata',
  th: 'ท่องเที่ยว',
  vi: 'du lịch',
  ca: 'viatge',
  hr: 'putovanje',
  sk: 'cestovanie',
  sl: 'potovanje',
  bg: 'пътуване',
  he: 'טיול',
  ms: 'pelancongan',
  fil: 'biyahe',
  tl: 'biyahe',
}

const LANG_REGION: Record<string, string> = {
  it: 'IT',
  en: 'US',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  pt: 'PT',
  nl: 'NL',
  pl: 'PL',
  ja: 'JP',
  ko: 'KR',
  ru: 'RU',
  ar: 'SA',
  hi: 'IN',
  zh: 'CN',
  sv: 'SE',
  da: 'DK',
  nb: 'NO',
  no: 'NO',
  fi: 'FI',
  el: 'GR',
  tr: 'TR',
  cs: 'CZ',
  ro: 'RO',
  hu: 'HU',
  uk: 'UA',
  id: 'ID',
  th: 'TH',
  vi: 'VN',
  ca: 'ES',
  hr: 'HR',
  sk: 'SK',
  sl: 'SI',
  bg: 'BG',
  he: 'IL',
  ms: 'MY',
  fil: 'PH',
  tl: 'PH',
}

function localeParts(locale: string): { lang: string; region: string } {
  const parts = locale.replace('_', '-').split('-')
  const lang = (parts[0] || 'it').toLowerCase()
  const region = (parts[1] || LANG_REGION[lang] || 'IT').toUpperCase()
  return { lang, region }
}

export function browserLocale(): string {
  if (typeof navigator === 'undefined') return 'it'
  return navigator.languages?.[0] || navigator.language || 'it'
}

export function videosSearchQuery(name: string, country: string, locale = browserLocale()): string {
  const { lang } = localeParts(locale)
  const word = TRAVEL_WORD[lang] || TRAVEL_WORD.en
  return `${name} ${country} ${word}`.trim()
}

export function youtubeSearchUrl(query: string, locale = browserLocale()): string {
  const { lang, region } = localeParts(locale)
  const params = new URLSearchParams({
    search_query: query,
    hl: lang,
    gl: region,
    persist_hl: '1',
    persist_gl: '1',
  })
  return `https://www.youtube.com/results?${params.toString()}`
}

export function videosUrl(name: string, country: string, locale = browserLocale()): string {
  return youtubeSearchUrl(videosSearchQuery(name, country, locale), locale)
}

export function youtubeResultsUrl(query: string, locale = browserLocale()): string {
  const trimmed = query.trim()
  if (/youtube\.com|youtu\.be/i.test(trimmed)) {
    const id = youtubeIdFromUrl(trimmed)
    if (id) return youtubeWatchUrl(id)
  }
  return youtubeSearchUrl(trimmed, locale)
}

export function mapsEmbedUrl(name: string, country: string, lat?: number | null, lng?: number | null): string {
  const q = lat != null && lng != null ? `${lat},${lng}` : `${name} ${country}`
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=12&output=embed&hl=it`
}

export function imagesEmbedUrl(name: string, country: string): string {
  return `https://www.google.com/search?igu=1&tbm=isch&q=${encodeURIComponent(`${name} ${country}`)}`
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export function youtubeIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0] || ''
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      const v = parsed.searchParams.get('v') || ''
      if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v
      const match = parsed.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/)
      return match?.[1] || null
    }
  } catch {
    return null
  }
  return null
}

export function youtubeEmbedUrl(videoId: string, locale = browserLocale()): string {
  const { lang } = localeParts(locale)
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    hl: lang,
  })
  if (typeof window !== 'undefined') params.set('origin', window.location.origin)
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}

export const TAG_LABELS: Record<string, string> = {
  cultura: 'cultura',
  natura: 'natura',
  mare: 'mare',
  archeologia: 'archeologia',
  cibo: 'cibo',
  citta: 'città',
  relax: 'relax',
  trekking: 'trekking',
  'vita-locale': 'vita locale',
  nightlife: 'vita notturna',
}
