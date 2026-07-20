export type EventStatus =
  | 'enquiry'
  | 'quoted'
  | 'pencil_hold'
  | 'client_declined'
  | 'not_booked'
  | 'cancelled'
  | 'confirmed_stc'
  | 'contract_received'
  | 'contracted'

export const EVENT_STATUSES: {
  value: EventStatus
  label: string
  bg: string
  color: string
}[] = [
  { value: 'enquiry',           label: 'Enquiry',           bg: 'var(--pill-enquiry-bg)',           color: 'var(--pill-enquiry-text)' },
  { value: 'quoted',            label: 'Quoted',             bg: 'var(--pill-quoted-bg)',            color: 'var(--pill-quoted-text)' },
  { value: 'pencil_hold',       label: 'Pencil Hold',        bg: 'var(--pill-enquiry-bg)',           color: 'var(--pill-enquiry-text)' },
  { value: 'client_declined',   label: 'Client Declined',    bg: 'var(--pill-cancelled-bg)',         color: 'var(--pill-cancelled-text)' },
  { value: 'not_booked',        label: 'Not Booked',         bg: 'var(--pill-not-booked-bg)',        color: 'var(--pill-not-booked-text)' },
  { value: 'cancelled',         label: 'Cancelled',          bg: 'var(--pill-cancelled-bg)',         color: 'var(--pill-cancelled-text)' },
  { value: 'confirmed_stc',     label: 'Confirmed STC',      bg: 'var(--pill-stc-bg)',               color: 'var(--pill-stc-text)' },
  { value: 'contract_received', label: 'Contract Received',  bg: 'var(--pill-contract-received-bg)', color: 'var(--pill-contract-received-text)' },
  { value: 'contracted',        label: 'Contracted',         bg: 'var(--pill-contracted-bg)',        color: 'var(--pill-contracted-text)' },
]

export const STATUS_MAP = Object.fromEntries(EVENT_STATUSES.map(s => [s.value, s])) as Record<EventStatus, typeof EVENT_STATUSES[number]>

// Statuses that count as active bookings
export const BOOKING_STATUSES: EventStatus[] = ['confirmed_stc', 'contract_received', 'contracted']
