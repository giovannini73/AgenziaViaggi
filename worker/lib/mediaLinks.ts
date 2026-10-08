const TRAVEL_WORD: Record<string, string> = {
  it: 'viaggio',
  en: 'travel',
  de: 'Reise',
  fr: 'voyage',
  es: 'viaje',
  pt: 'viagem',
}

const LANG_REGION: Record<string, string> = {
  it: 'IT',
  en: 'US',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  pt: 'PT',
}

function localeParts(locale: string): { lang: string; region: string } {
  const parts = locale.replace('_', '-').split('-')
  const lang = (parts[0] || 'it').toLowerCase()
  const region = (parts[1] || LANG_REGION[lang] || 'IT').toUpperCase()
  return { lang, region }
}

export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function imagesSearchUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`
}

export function videosSearchUrl(query: string, locale: string): string {
  const { lang, region } = localeParts(locale)
  const word = TRAVEL_WORD[lang] || TRAVEL_WORD.en
  const params = new URLSearchParams({
    search_query: `${query} ${word}`.trim(),
    hl: lang,
    gl: region,
    persist_hl: '1',
    persist_gl: '1',
  })
  return `https://www.youtube.com/results?${params.toString()}`
}

export function resolveAiLink(
  kind: string,
  query: string,
  url: string,
  locale: string,
): { label: string; url: string; kind: 'maps' | 'images' | 'videos' | 'other' } | null {
  const q = query.trim() || url.trim()
  if (!q && kind !== 'other') return null
  if (kind === 'maps') return { kind: 'maps', label: q, url: mapsSearchUrl(q) }
  if (kind === 'images') return { kind: 'images', label: q, url: imagesSearchUrl(q) }
  if (kind === 'videos') return { kind: 'videos', label: q, url: videosSearchUrl(q, locale) }
  if (!url.startsWith('http')) return null
  return { kind: 'other', label: q || url, url }
}
