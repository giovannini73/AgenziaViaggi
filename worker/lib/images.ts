export type SearchImage = {
  url: string
  thumb: string
  title: string
}

const UA = 'ItinerariAperti/1.0 (travel itinerary portal)'

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

async function searchOpenverse(query: string): Promise<SearchImage[]> {
  const params = new URLSearchParams({ q: query, page_size: '12', mature: 'false' })
  const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = (await res.json()) as {
    results?: { url?: string; thumbnail?: string; title?: string; mature?: boolean }[]
  }
  const out: SearchImage[] = []
  const seen = new Set<string>()
  for (const item of data.results || []) {
    const url = item.url || ''
    if (item.mature || !isHttpUrl(url) || seen.has(url)) continue
    seen.add(url)
    out.push({ url, thumb: isHttpUrl(item.thumbnail || '') ? item.thumbnail! : url, title: (item.title || '').slice(0, 180) })
  }
  return out
}

async function searchWikimedia(query: string): Promise<SearchImage[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '800',
  })
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        { title?: string; imageinfo?: { url?: string; thumburl?: string; mime?: string }[] }
      >
    }
  }
  const out: SearchImage[] = []
  const seen = new Set<string>()
  for (const page of Object.values(data.query?.pages || {})) {
    const info = page.imageinfo?.[0]
    const mime = info?.mime || ''
    if (!mime.startsWith('image/') || mime.includes('svg')) continue
    const url = info?.url || info?.thumburl || ''
    if (!isHttpUrl(url) || seen.has(url)) continue
    seen.add(url)
    out.push({
      url,
      thumb: isHttpUrl(info?.thumburl || '') ? info!.thumburl! : url,
      title: (page.title || '').replace(/^File:/, '').slice(0, 180),
    })
  }
  return out
}

export async function searchPlaceImages(query: string): Promise<SearchImage[]> {
  const primary = await searchOpenverse(query)
  if (primary.length >= 8) return primary.slice(0, 12)
  const extra = await searchWikimedia(query)
  const seen = new Set(primary.map((item) => item.url))
  const merged = [...primary]
  for (const item of extra) {
    if (seen.has(item.url)) continue
    seen.add(item.url)
    merged.push(item)
    if (merged.length >= 12) break
  }
  return merged
}
