export const TRAVEL_TAGS = [
  'cultura',
  'natura',
  'mare',
  'archeologia',
  'cibo',
  'citta',
  'relax',
  'trekking',
  'vita-locale',
  'nightlife',
] as const

export type TravelTag = (typeof TRAVEL_TAGS)[number]

export type TimelineTransfer = {
  id: string
  kind: 'day' | 'night'
  notes: string
}

export type Stop = {
  timeline_transfers?: TimelineTransfer[]
  id: string
  itinerary_id: string
  position: number
  name: string
  country: string
  latitude: number | null
  longitude: number | null
  arrival_day: string
  nights: number
  description: string
  why_visit: string
  attractions: string
  food_notes: string
  markets: string
  where_to_eat: string
  where_to_stay: string
  beaches: string
  excursions: string
  transfer_minutes: number | null
  transfer_distance_km: number | null
  transfer_mode: string
  image_url: string | null
  video_url: string | null
  avg_rating: number | null
  rating_count: number
  votes: UserVote[]
  comments?: CommentItem[]
  notes?: StopNoteItem[]
}

export type CommentItem = {
  id: string
  author_name: string
  comment: string
  rating: number | null
  created_at: string
}

export type StopNoteItem = {
  id: string
  stop_id: string
  user_id: string
  author_name: string
  body: string
  video_id: string | null
  created_at: string
}

export const SITE_PEOPLE = [
  { id: 'sabrina', name: 'Sabrina' },
  { id: 'claudio', name: 'Claudio' },
] as const

export type SitePerson = (typeof SITE_PEOPLE)[number]
export type SitePersonId = SitePerson['id']

export type SiteUser = {
  id: string
  name: string
}

export type UserVote = {
  user_id: string
  name: string
  rating: number | null
  seen: boolean
}

export function fillVotes(rows: { user_id: string; rating?: number | null; seen?: boolean }[]): UserVote[] {
  return SITE_PEOPLE.map((person) => {
    const row = rows.find((item) => item.user_id === person.id)
    return {
      user_id: person.id,
      name: person.name,
      rating: row?.rating ?? null,
      seen: Boolean(row?.seen),
    }
  })
}

export function voteBadge(votes: UserVote[] | undefined): string {
  const list = votes?.length ? votes : fillVotes([])
  if (list.every((vote) => vote.rating == null)) return 'nessun voto'
  return list.map((vote) => `${vote.name} ${vote.rating ?? '—'}`).join(' · ')
}

export type ItineraryListItem = {
  id: string
  title: string
  slug: string
  description: string
  country: string
  start_city: string
  end_city: string
  start_date: string | null
  end_date: string | null
  travel_style: string
  cover_image: string | null
  tags: string[]
  recommended_period: string
  duration_nights: number
  duration_days: number
  stop_count: number
  avg_rating: number | null
  rating_count: number
  votes: UserVote[]
  created_at: string
  updated_at: string
}

export type ItineraryDetail = ItineraryListItem & {
  stops: Stop[]
  comments: CommentItem[]
}

export type Revision = {
  id: string
  itinerary_id: string
  created_at: string
}

export type StopInput = {
  timeline_transfers?: TimelineTransfer[]
  id?: string
  name: string
  country?: string
  latitude?: number | null
  longitude?: number | null
  arrival_day?: string
  nights?: number
  description?: string
  why_visit?: string
  attractions?: string
  food_notes?: string
  markets?: string
  where_to_eat?: string
  where_to_stay?: string
  beaches?: string
  excursions?: string
  transfer_minutes?: number | null
  transfer_distance_km?: number | null
  transfer_mode?: string
  image_url?: string | null
  video_url?: string | null
}

export type ItineraryInput = {
  title: string
  description?: string
  country?: string
  start_city?: string
  end_city?: string
  start_date?: string | null
  end_date?: string | null
  travel_style?: string
  cover_image?: string | null
  tags?: string[]
  recommended_period?: string
  stops?: StopInput[]
}

export type SearchImage = {
  url: string
  thumb: string
  title: string
}

export type YoutubeVideo = {
  id: string
  title: string
}

export type AiLinkKind = 'maps' | 'images' | 'videos' | 'other'

export type AiLink = {
  label: string
  url: string
  kind: AiLinkKind
}

export type AiProposal = {
  action: 'reply' | 'update_itinerary' | 'create_itinerary'
  message: string
  summary: string
  changes: string[]
  links: AiLink[]
  itinerary: ItineraryInput | null
}

export type AiChatResponse = {
  conversation_id: string
  proposal: AiProposal
}
