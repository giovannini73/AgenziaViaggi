import type { AiChatResponse, CommentItem, ItineraryDetail, ItineraryInput, ItineraryListItem, Revision, SearchImage, Stop, StopNoteItem, YoutubeVideo } from '../../shared/types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (res.status === 401 && path !== '/api/login' && typeof window !== 'undefined') {
    if (window.location.pathname !== '/accedi') window.location.assign('/accedi')
  }
  if (!res.ok) throw new Error(data.error || 'Richiesta non riuscita')
  return data
}

export const api = {
  login: (password: string) =>
    request<{ ok: boolean; user: { id: string; name: string } }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  logout: () => request<{ ok: boolean }>('/api/logout', { method: 'POST', body: '{}' }),
  me: () => request<{ id: string; name: string; people: { id: string; name: string }[] }>('/api/me'),
  itineraries: (params?: URLSearchParams) =>
    request<ItineraryListItem[]>(`/api/itineraries${params?.toString() ? `?${params}` : ''}`),
  itinerary: (id: string) => request<ItineraryDetail>(`/api/itineraries/${id}`),
  create: (body: ItineraryInput) =>
    request<ItineraryDetail>('/api/itineraries', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: ItineraryInput) =>
    request<ItineraryDetail>(`/api/itineraries/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateDeparture: (id: string, start_date: string | null) =>
    request<ItineraryDetail>(`/api/itineraries/${id}`, { method: 'PUT', body: JSON.stringify({ start_date }) }),
  updateNights: (id: string, nights: number) =>
    request<ItineraryDetail>(`/api/stops/${id}/nights`, { method: 'PUT', body: JSON.stringify({ nights }) }),
  updateTimelineTransfers: (id: string, timeline_transfers: import('../../shared/types').TimelineTransfer[]) =>
    request<ItineraryDetail>(`/api/stops/${id}/timeline-transfers`, { method: 'PUT', body: JSON.stringify({ timeline_transfers }) }),
  moveStop: (id: string, direction: -1 | 1) =>
    request<ItineraryDetail>(`/api/stops/${id}/move`, { method: 'PUT', body: JSON.stringify({ direction }) }),
  updateTransfer: (id: string, body: { transfer_minutes: number | null; transfer_distance_km: number | null; transfer_mode: string }) =>
    request<Stop>(`/api/stops/${id}/transfer`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/api/itineraries/${id}`, { method: 'DELETE' }),
  duplicate: (id: string) =>
    request<ItineraryDetail>(`/api/itineraries/${id}/duplicate`, { method: 'POST', body: '{}' }),
  rateItinerary: (id: string, rating: number) =>
    request<ItineraryDetail>(`/api/itineraries/${id}/rating`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    }),
  commentItinerary: (id: string, body: { author_name: string; comment: string; rating: number | null }) =>
    request<CommentItem[]>(`/api/itineraries/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  rateStop: (id: string, rating: number) =>
    request<Stop>(`/api/stops/${id}/rating`, { method: 'POST', body: JSON.stringify({ rating }) }),
  markStopSeen: (id: string, seen: boolean) =>
    request<Stop>(`/api/stops/${id}/seen`, { method: 'POST', body: JSON.stringify({ seen }) }),
  commentStop: (id: string, body: { author_name: string; comment: string; rating: number | null }) =>
    request<CommentItem[]>(`/api/stops/${id}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  addStopNote: (id: string, body: string, videoId?: string | null) =>
    request<StopNoteItem[]>(`/api/stops/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body, video_id: videoId || null }),
    }),
  deleteStopNote: (id: string) => request<StopNoteItem[]>(`/api/notes/${id}`, { method: 'DELETE' }),
  revisions: (id: string) => request<Revision[]>(`/api/itineraries/${id}/revisions`),
  restore: (id: string, revision_id: string) =>
    request<ItineraryDetail>(`/api/itineraries/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ revision_id }),
    }),
  aiChat: (body: { message: string; itinerary_id?: string | null; conversation_id?: string | null; locale?: string }) =>
    request<AiChatResponse>('/api/ai/chat', { method: 'POST', body: JSON.stringify(body) }),
  aiCreate: (body: Record<string, unknown>) =>
    request<AiChatResponse>('/api/ai/create-itinerary', { method: 'POST', body: JSON.stringify(body) }),
  aiApplyCreate: (itinerary: ItineraryInput) =>
    request<ItineraryDetail>('/api/ai/create-itinerary', {
      method: 'POST',
      body: JSON.stringify({ apply: true, itinerary }),
    }),
  aiApplyUpdate: (itinerary_id: string, itinerary: ItineraryInput) =>
    request<ItineraryDetail>('/api/ai/modify-itinerary', {
      method: 'POST',
      body: JSON.stringify({ itinerary_id, apply: true, itinerary }),
    }),
  searchVideos: (q: string, locale?: string) => {
    const params = new URLSearchParams({ q })
    if (locale) params.set('locale', locale)
    return request<{ videos: YoutubeVideo[] }>(`/api/videos?${params}`)
  },
  searchImages: (q: string) => {
    const params = new URLSearchParams({ q })
    return request<{ images: SearchImage[] }>(`/api/images?${params}`)
  },
  favoriteStop: (id: string, kind: 'image' | 'video', url: string | null) =>
    request<Stop>(`/api/stops/${id}/favorite`, {
      method: 'POST',
      body: JSON.stringify({ kind, url }),
    }),
}
