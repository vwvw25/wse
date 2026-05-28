import { createServiceClient } from '@/lib/supabase'
import type { EventRecord } from '@/types/quote'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .select('*, invoices(id, status), event_musicians(id, musician_id)')
    .order('created_at', { ascending: false })

  if (error) return <div style={{ padding: 32, color: 'red' }}>Failed to load: {error.message}</div>

  const events = (data ?? []) as EventRecord[]

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
            background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)',
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
        <div className="admin-table-wrap"><EventsClient events={events} /></div>
      )}
    </div>
  )
}
