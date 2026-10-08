const stopSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'name',
    'country',
    'nights',
    'latitude',
    'longitude',
    'arrival_day',
    'description',
    'why_visit',
    'attractions',
    'food_notes',
    'markets',
    'where_to_eat',
    'where_to_stay',
    'beaches',
    'excursions',
    'transfer_minutes',
    'transfer_distance_km',
    'transfer_mode',
  ],
  properties: {
    name: { type: 'string' },
    country: { type: 'string' },
    nights: { type: 'integer' },
    latitude: { type: 'number' },
    longitude: { type: 'number' },
    arrival_day: { type: 'string' },
    description: { type: 'string' },
    why_visit: { type: 'string' },
    attractions: { type: 'string' },
    food_notes: { type: 'string' },
    markets: { type: 'string' },
    where_to_eat: { type: 'string' },
    where_to_stay: { type: 'string' },
    beaches: { type: 'string' },
    excursions: { type: 'string' },
    transfer_minutes: { type: 'integer' },
    transfer_distance_km: { type: 'number' },
    transfer_mode: { type: 'string' },
  },
} as const

const itinerarySchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'description',
    'country',
    'start_city',
    'end_city',
    'start_date',
    'end_date',
    'travel_style',
    'recommended_period',
    'tags',
    'stops',
  ],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    country: { type: 'string' },
    start_city: { type: 'string' },
    end_city: { type: 'string' },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
    travel_style: { type: 'string' },
    recommended_period: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    stops: { type: 'array', items: stopSchema },
  },
} as const

export const AI_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'message', 'summary', 'changes', 'links', 'itinerary'],
  properties: {
    action: { type: 'string', enum: ['reply', 'update_itinerary', 'create_itinerary'] },
    message: { type: 'string' },
    summary: { type: 'string' },
    changes: { type: 'array', items: { type: 'string' } },
    links: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'kind', 'query', 'url'],
        properties: {
          label: { type: 'string' },
          kind: { type: 'string', enum: ['maps', 'images', 'videos', 'other'] },
          query: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
    itinerary: itinerarySchema,
  },
} as const

export const SYSTEM_PROMPT = `Sei un esperto di viaggi indipendenti, con particolare conoscenza dell'Asia.

Privilegia:
* cultura locale
* mercati
* piccoli ristoranti
* cucina tradizionale
* guesthouse e homestay
* quartieri vissuti
* esperienze autentiche

Evita:
* resort di lusso
* ristoranti eleganti non richiesti
* itinerari troppo serrati
* trasferimenti inutilmente lunghi

Per ogni itinerario:
* rispetta le date
* considera tempi realistici di trasferimento
* minimizza cambi di hotel
* assegna almeno due notti alle tappe importanti salvo esplicita richiesta diversa
* privilegia 3-4 notti nelle destinazioni principali e al mare.

Rispondi sempre in italiano, in modo caldo e concreto, come un viaggiatore che consiglia un amico.

Regole di azione:
- "reply": domande, consigli, spiegazioni, ricerca di video/immagini/mappe senza cambiare l'itinerario. In questo caso itinerary.stops può essere vuoto e title vuoto.
- "update_itinerary": l'utente vuole modificare l'itinerario attualmente aperto (tappe, notti, date, ordine, città). Compila l'itinerario completo già modificato, non un elenco di patch.
- "create_itinerary": l'utente vuole un itinerario nuovo (altro paese o viaggio da zero). Non sovrascrivere quello aperto.

Se chiedono video, immagini o mappe: action "reply" e riempi links. Per videos/images/maps metti il nome del luogo in "query" e lascia "url" vuoto. Usa la lingua del browser indicata per i video.

Coordinate GPS: usa valori reali. Tempi di trasferimento realistici in minuti. Date in formato YYYY-MM-DD. Prima tappa: transfer_minutes 0.

Non dire mai che hai già salvato: le modifiche restano una proposta finché la persona non preme "Applica modifiche".`

type ResponseInput = { role: 'user' | 'assistant'; content: string }

type OpenAiResponse = {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{ type?: string; text?: string }>
  }>
  error?: { message?: string }
}

export function extractOutputText(data: OpenAiResponse): string {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text
  const parts: string[] = []
  for (const item of data.output || []) {
    for (const block of item.content || []) {
      if ((block.type === 'output_text' || block.type === 'text') && block.text) parts.push(block.text)
    }
  }
  return parts.join('\n').trim()
}

export async function createStructuredResponse(opts: {
  apiKey: string
  model: string
  instructions: string
  input: ResponseInput[]
}): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      instructions: opts.instructions,
      input: opts.input,
      text: {
        format: {
          type: 'json_schema',
          name: 'travel_ai',
          strict: true,
          schema: AI_OUTPUT_SCHEMA,
        },
      },
    }),
  })
  const data = (await res.json()) as OpenAiResponse
  if (!res.ok) {
    throw new Error(data.error?.message || 'Il servizio di chat non ha risposto')
  }
  const text = extractOutputText(data)
  if (!text) throw new Error('Risposta vuota dal servizio di chat')
  return text
}
