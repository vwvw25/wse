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
  home_city: string | null
  address_line1: string | null
  address_line2: string | null
  address_city: string | null
  address_county: string | null
  address_postcode: string | null
  dietary_requirements: string[]   // e.g. ['vegan', 'gluten_intolerant']
  car_registration: string | null
  car_make: string | null
  car_model: string | null
  car_colour: string | null
  date_of_birth: string | null     // ISO date string
  passport_number: string | null
  covid_vaccinated: boolean | null
  covid_booster: boolean | null
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

export type OnboardingType = 'general' | 'info_request'

// All fields that can be requested (shown as checkboxes in send modal)
// key = DB column name, label = what the musician sees
export const ONBOARDING_OPTIONAL_FIELDS = [
  { key: 'address',          label: 'Address',          group: 'Contact' },
  { key: 'car_registration', label: 'Car registration', group: 'Vehicle' },
  { key: 'car_make',         label: 'Car make',         group: 'Vehicle' },
  { key: 'car_model',        label: 'Car model',        group: 'Vehicle' },
  { key: 'car_colour',       label: 'Car colour',       group: 'Vehicle' },
  { key: 'date_of_birth',    label: 'Date of birth',    group: 'Identity' },
  { key: 'passport_number',  label: 'Passport number',  group: 'Identity' },
  { key: 'covid_vaccinated', label: 'COVID vaccinated',  group: 'Health' },
  { key: 'covid_booster',    label: 'COVID booster',    group: 'Health' },
] as const

// In info_request mode, these base fields are also optionally requestable
export const ONBOARDING_BASE_FIELDS = [
  { key: 'phone',                 label: 'Phone number',         group: 'Contact' },
  { key: 'dietary_requirements',  label: 'Dietary requirements', group: 'Dietary' },
] as const

export type OnboardingFieldKey =
  | typeof ONBOARDING_OPTIONAL_FIELDS[number]['key']
  | typeof ONBOARDING_BASE_FIELDS[number]['key']
  | 'address'

export interface OnboardingToken {
  id: string
  musician_id: string
  token: string
  type: OnboardingType
  fields_requested: string[]
  deadline_at: string
  reminder_1_sent_at: string | null
  reminder_2_sent_at: string | null
  completed_at: string | null
  created_at: string
  musician?: Musician | null
}
