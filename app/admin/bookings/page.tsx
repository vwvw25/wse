import { createServiceClient } from '@/lib/supabase'
import type { EventRecord } from '@/types/quote'
import { STATUS_MAP, BOOKING_STATUSES } from '@/lib/event-statuses'
import type { EventStatus } from '@/lib/event-statuses'
import BookingsClient from './BookingsClient'

export default async function BookingsPage() {
  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('status', BOOKING_STATUSES)
    .order('event_date', { ascending: true })

  if (error) return <div style={{ padding: 32, color: 'red' }}>Failed to load: {error.message}</div>

  const all = (data ?? []) as EventRecord[]
  const future = all.filter(ev => !ev.event_date || ev.event_date >= today)
  const past = all.filter(ev => ev.event_date && ev.event_date < today)

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Bookings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Confirmed STC &amp; Contracted
        </p>
      </div>
      <BookingsClient future={future} past={past} />
    </div>
  )
}
