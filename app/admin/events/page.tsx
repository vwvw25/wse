import { createServiceClient } from '@/lib/supabase'
import { fetchScopedEvents, fetchUnpaidInvoicesSummary } from '@/lib/invoice-scope'
import type { EventRecord } from '@/types/quote'
import type { EventMusician, Musician } from '@/types/musicians'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const supabase = createServiceClient()
  const [
    { data, error },
    { data: bandSlotsData },
    { data: musiciansData },
    scopedEvents,
    unpaidInvoices,
  ] = await Promise.all([
    supabase
      .from('events')
      .select('*, invoices(id, status), event_musicians(id, musician_id)')
      .order('event_date', { ascending: false, nullsFirst: false }),
    supabase.from('event_musicians').select('*').order('date_added'),
    supabase.from('musicians').select('*').order('first_name').order('last_name'),
    fetchScopedEvents(supabase),
    fetchUnpaidInvoicesSummary(supabase),
  ])

  if (error) return <div style={{ padding: 32, color: 'red' }}>Failed to load: {error.message}</div>

  const events = (data ?? []) as EventRecord[]
  const bandSlots = (bandSlotsData ?? []) as EventMusician[]
  const musicians = (musiciansData ?? []) as Musician[]

  const uninvoicedEvents = scopedEvents.filter(e => e.isUninvoiced)
  const invoiceSummary = {
    totalOutstanding: unpaidInvoices.total,
    unpaidCount: unpaidInvoices.count,
    totalUninvoiced: uninvoicedEvents.reduce((sum, e) => sum + e.amount, 0),
    uninvoicedCount: uninvoicedEvents.length,
    totalOutstandingScoped: scopedEvents.reduce((sum, e) => sum + e.amount, 0),
    scopedOwingCount: scopedEvents.filter(e => e.amount > 0.005).length,
  }

  // Band builder view — same "active" event scope the old standalone page used
  const bandBuilderEvents = events
    .filter(ev => !['client_declined', 'cancelled'].includes(ev.status))
    .map(ev => ({
      id: ev.id,
      agency_name: ev.agency_name,
      agent_name: ev.agent_name,
      event_date: ev.event_date,
      status: ev.status,
      slots: bandSlots.filter(s => s.event_id === ev.id),
    }))
    .sort((a, b) => (a.event_date ?? '9999-99-99').localeCompare(b.event_date ?? '9999-99-99'))

  return (
    <div className="admin-page" style={{ fontFamily: 'var(--font)' }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Events</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="page-header-actions">
          <a href="/admin/events/new" style={{
            display: 'inline-block', padding: '8px 16px', fontSize: 13, fontWeight: 500,
            background: 'var(--bg)', color: 'var(--text)',
            border: '0.5px solid var(--border-hover)',
            borderRadius: 'var(--radius-sm)', textDecoration: 'none',
          }}>
            New
          </a>
          <a href="/admin/email-to-quote" style={{
            display: 'inline-block', padding: '8px 16px', fontSize: 13, fontWeight: 500,
            background: 'var(--accent)', color: 'var(--accent-text-on)', borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
          }}>
            New from email
          </a>
        </div>
      </div>

      {events.length === 0 ? (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          color: 'var(--text-tertiary)', fontSize: 13,
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
        }}>
          No events yet — use &ldquo;New from email&rdquo; to create one.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <EventsClient events={events} bandBuilderEvents={bandBuilderEvents} musicians={musicians} invoiceSummary={invoiceSummary} />
        </div>
      )}
    </div>
  )
}
