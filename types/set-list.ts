export interface Song {
  id: string
  title: string
  artist: string | null
  key: string | null
  link: string | null
  tags: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SetList {
  id: string
  event_id: string | null
  name: string
  is_template: boolean
  created_at: string
  // joined
  event?: {
    id: string
    event_date: string | null
    venue_name: string | null
    start_time?: string | null
    finish_time?: string | null
    request_details?: { sets_requested?: string | null } | null
  } | null
  song_count?: number
}

export interface TagOption {
  id: string
  category: string
  value: string
  sort_order: number
  created_at: string
}

export const TAG_CATEGORY_LABELS: Record<string, string> = {
  tempo: 'Tempo',
  era: 'Era',
  genre: 'Genre',
  special: 'Special category',
  occasion: 'Occasion',
}

export const TAG_CATEGORIES = ['tempo', 'era', 'genre', 'special', 'occasion'] as const

export interface SetListSong {
  id: string
  set_list_id: string
  song_id: string
  position: number
  set_number: number | null
  created_at: string
  // joined
  song?: Song
}
