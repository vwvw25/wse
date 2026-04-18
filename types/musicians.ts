export const INSTRUMENTS = [
  'Vocals',
  'Guitar',
  'Bass',
  'Drums',
  'Keys',
  'Trumpet',
  'Saxophone',
  'Trombone',
  'Cello',
  'Violin',
] as const

export type Instrument = typeof INSTRUMENTS[number]

export const DEADLINE_OPTIONS = [6, 12, 24, 48] as const
export type DeadlineHours = typeof DEADLINE_OPTIONS[number]

export interface Musician {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  primary_instrument: string | null
  secondary_instrument: string | null
  default_fee: number
  notes: string | null
  created_at: string
}

export function musicianFullName(m: Pick<Musician, 'first_name' | 'last_name'>): string {
  return [m.first_name, m.last_name].filter(Boolean).join(' ')
}

export type MusicianAvailability = 'yes' | 'no' | 'tbc' | 'email_sent' | 'reminder_sent'

export interface EventMusician {
  id: string
  event_id: string
  musician_id: string | null
  instrument: string
  fee: number
  additional_costs: number
  availability: MusicianAvailability
  date_added: string
  notes: string | null
  // Availability request fields
  token: string | null
  deadline_hours: DeadlineHours
  email_sent_at: string | null
  reminder_sent_at: string | null
  // Joined
  musician?: Musician | null
}

export interface BandTemplate {
  id: string
  name: string
  created_at: string
  slots?: BandTemplateSlot[]
}

export interface BandTemplateSlot {
  id: string
  template_id: string
  instrument: string
  sort_order: number
}

export interface PreferenceOrder {
  id: string
  instrument: string
  musician_id: string
  rank: number
  created_at: string
  musician?: Musician
}
