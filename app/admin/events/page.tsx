import { createServiceClient } from '@/lib/supabase'
import type { EventRecord } from '@/types/quote'

function formatDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', label: 'Pending quote' },
  quoted:    { bg: 'var(--bg-info)',      color: 'var(--text-info)',      label: 'Quoted' },
  confirmed: { bg: '#e6f4ea',            color: '#276749',               label: 'Confirmed' },
  cancelled: { bg: 'var(--bg-secondary)', color: 'var(--text-tertiary)', label: 'Cancelled' },
}

export default async function EventsPage() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return <div style={{ padding: 32, color: 'red' }}>Failed to load: {error.message}</div>

  const events = (data ?? []) as EventRecord[]

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Events</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>
        <a href="/admin/email-to-quote" style={{
          display: 'inline-block', padding: '8px 16px', fontSize: 13, fontWeight: 500,
          background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)',
          textDecoration: 'none',
        }}>
          New from email
        </a>
      </div>

      {events.length === 0 ? (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          color: 'var(--text-tertiary)', fontSize: 13,
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
        }}>
          No events yet — use "New from email" to create one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '160px 1fr 1fr 130px 100px',
            padding: '8px 16px', gap: 16,
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <div>Date</div>
            <div>Agency / Agent</div>
            <div>Request details</div>
            <div>Times</div>
            <div>Status</div>
          </div>

          {events.map(ev => {
            const st = STATUS_STYLES[ev.status] ?? STATUS_STYLES.pending
            const name = ev.agency_name || ev.agent_name || '—'
            const agent = ev.agency_name && ev.agent_name ? ev.agent_name : null
            const rd = ev.request_details
            const requestSummary = [rd?.band_size_requested, rd?.sets_requested].filter(Boolean).join(' · ') || '—'
            const times = [ev.start_time, ev.finish_time].filter(Boolean).join(' – ') || '—'

            return (
              <a
                key={ev.id}
                href={`/admin/events/${ev.id}`}
                style={{
                  display: 'grid', gridTemplateColumns: '160px 1fr 1fr 130px 100px',
                  padding: '14px 16px', gap: 16, textDecoration: 'none',
                  background: 'var(--bg)', border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)', alignItems: 'center',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                  {formatDate(ev.event_date)}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{name}</div>
                  {agent && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{agent}</div>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{requestSummary}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{times}</div>
                <div>
                  <span style={{
                    display: 'inline-block', padding: '3px 8px',
                    fontSize: 11, fontWeight: 500, borderRadius: 4,
                    background: st.bg, color: st.color,
                  }}>
                    {st.label}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
