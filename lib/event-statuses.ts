export type EventStatus =
  | 'enquiry'
  | 'quoted'
  | 'pencil_hold'
  | 'client_declined'
  | 'cancelled'
  | 'confirmed_stc'
  | 'contracted'

export const EVENT_STATUSES: {
  value: EventStatus
  label: string
  bg: string
  color: string
}[] = [
  { value: 'enquiry',         label: 'Enquiry',         bg: 'var(--bg-secondary)',  color: 'var(--text-secondary)' },
  { value: 'quoted',          label: 'Quoted',           bg: 'var(--bg-info)',       color: 'var(--text-info)' },
  { value: 'pencil_hold',     label: 'Pencil Hold',      bg: '#fef9c3',              color: '#854d0e' },
  { value: 'client_declined', label: 'Client Declined',  bg: '#fee2e2',              color: '#991b1b' },
  { value: 'cancelled',       label: 'Cancelled',        bg: 'var(--bg-secondary)',  color: 'var(--text-tertiary)' },
  { value: 'confirmed_stc',   label: 'Confirmed STC',    bg: '#dcfce7',              color: '#166534' },
  { value: 'contracted',      label: 'Contracted',       bg: '#bbf7d0',              color: '#14532d' },
]

export const STATUS_MAP = Object.fromEntries(EVENT_STATUSES.map(s => [s.value, s])) as Record<EventStatus, typeof EVENT_STATUSES[number]>

// Statuses that count as active bookings
export const BOOKING_STATUSES: EventStatus[] = ['confirmed_stc', 'contracted']
