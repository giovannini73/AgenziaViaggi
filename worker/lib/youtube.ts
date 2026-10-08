const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export type YoutubeVideo = {
  id: string
  title: string
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}

export function youtubeIdFromUrl(url: string): string | null {
  const trimmed = url.trim()
  if (VIDEO_ID.test(trimmed)) return trimmed
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0] || ''
      return VIDEO_ID.test(id) ? id : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      const v = parsed.searchParams.get('v') || ''
      if (VIDEO_ID.test(v)) return v
      const match = parsed.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/)
      return match?.[1] && VIDEO_ID.test(match[1]) ? match[1] : null
    }
  } catch {
    return null
  }
  return null
}

function localeParts(locale: string): { lang: string; region: string } {
  const parts = locale.replace('_', '-').split('-')
  const lang = (parts[0] || 'it').toLowerCase()
  const region = (parts[1] || 'IT').toUpperCase()
  return { lang, region: region.length === 2 ? region : 'IT' }
}

function videoTitle(renderer: Record<string, unknown>): string {
  const title = renderer.title as Record<string, unknown> | undefined
  if (!title) return ''
  if (typeof title.simpleText === 'string') return title.simpleText
  if (Array.isArray(title.runs)) {
    return title.runs.map((run) => (typeof run === 'object' && run && 'text' in run ? String(run.text) : '')).join('')
  }
  return ''
}

function collectVideos(root: unknown): YoutubeVideo[] {
  const out: YoutubeVideo[] = []
  const seen = new Set<string>()
  const queue: unknown[] = [root]
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i]
    if (!node || typeof node !== 'object') continue
    if (Array.isArray(node)) {
      queue.push(...node)
      continue
    }
    const obj = node as Record<string, unknown>
    const renderer = obj.videoRenderer as Record<string, unknown> | undefined
    if (renderer && typeof renderer.videoId === 'string' && VIDEO_ID.test(renderer.videoId)) {
      if (!seen.has(renderer.videoId)) {
        seen.add(renderer.videoId)
        out.push({ id: renderer.videoId, title: videoTitle(renderer).slice(0, 180) })
      }
    }
    for (const value of Object.values(obj)) queue.push(value)
  }
  return out
}

async function innertubeSearch(query: string, lang: string, region: string, clientName: 'WEB' | 'ANDROID'): Promise<YoutubeVideo[]> {
  const clientVersion = clientName === 'WEB' ? '2.20240815.00.00' : '19.28.35'
  const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Accept-Language': `${lang}-${region},${lang};q=0.9`,
    },
    body: JSON.stringify({
      context: {
        client: {
          hl: lang,
          gl: region,
          clientName,
          clientVersion,
        },
      },
      query,
      params: 'EgIQAQ==',
    }),
  })
  if (!res.ok) return []
  const data: unknown = await res.json()
  return collectVideos(data)
}

async function scrapeSearch(query: string, lang: string, region: string): Promise<YoutubeVideo[]> {
  const params = new URLSearchParams({
    search_query: query,
    hl: lang,
    gl: region,
    sp: 'EgIQAQ==',
  })
  const res = await fetch(`https://www.youtube.com/results?${params}`, {
    signal: AbortSignal.timeout(8000),
    headers: {
      'User-Agent': UA,
      'Accept-Language': `${lang}-${region},${lang};q=0.9`,
    },
  })
  if (!res.ok) return []
  const html = await res.text()
  const ids = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1])
  const out: YoutubeVideo[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, title: '' })
  }
  return out
}

async function keepEmbeddable(videos: YoutubeVideo[], max: number): Promise<YoutubeVideo[]> {
  const kept: YoutubeVideo[] = []
  const candidates = videos.slice(0, 15)
  for (let i = 0; i < candidates.length; i += 5) {
    const chunk = candidates.slice(i, i + 5)
    const flags = await Promise.all(
      chunk.map(async (video) => {
        try {
          const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${video.id}`)}`
          const res = await fetch(url, { signal: AbortSignal.timeout(4000), headers: { 'User-Agent': UA } })
          return res.ok
        } catch {
          return false
        }
      }),
    )
    chunk.forEach((video, index) => {
      if (flags[index]) kept.push(video)
    })
    if (kept.length >= max) break
  }
  return kept.slice(0, max)
}

export async function searchYoutubeVideos(query: string, locale: string): Promise<YoutubeVideo[]> {
  const { lang, region } = localeParts(locale)
  let found = await innertubeSearch(query, lang, region, 'WEB')
  if (!found.length) found = await innertubeSearch(query, lang, region, 'ANDROID')
  if (!found.length) found = await scrapeSearch(query, lang, region)
  if (!found.length) return []
  const embeddable = await keepEmbeddable(found, 6)
  return (embeddable.length ? embeddable : found).slice(0, 6)
}
