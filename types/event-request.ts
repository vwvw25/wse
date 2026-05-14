import type { Song } from './set-list'

export interface EventRequest {
  id: string
  event_id: string
  type: 'from_repertoire' | 'to_learn'
  song_id: string | null
  title: string
  artist: string | null
  status: 'requested' | 'confirmed' | 'declined'
  notes: string | null
  created_at: string
  song?: Song | null
}
