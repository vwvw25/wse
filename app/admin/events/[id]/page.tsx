import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { EventRecord, QuoteRecord } from '@/types/quote'

function formatDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCreated(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', label: 'Pending quote' },
  quoted:    { bg: 'var(--bg-info)',      color: 'var(--text-info)',      label: 'Quoted' },
  confirmed: { bg: '#e6f4ea',            color: '#276749',               label: 'Confirmed' },
  cancelled: { bg: 'var(--bg-secondary)', color: 'var(--text-tertiary)', label: 'Cancelled' },
}

function Cell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3, letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? 'var(--text)' : 'var(--text-tertiary)' }}>{value || '—'}</div>
    </div>
  )
}

function FullRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ padding: '10px 0', borderTop: '0.5px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3, letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: eventData }, { data: quotesData }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('quotes').select('id, created_at, inputs').eq('event_id', id).order('created_at', { ascending: false }),
  ])

  if (!eventData) notFound()

  const event = eventData as EventRecord
  const quotes = (quotesData ?? []) as Pick<QuoteRecord, 'id' | 'created_at' | 'inputs'>[]
  const st = STATUS_STYLES[event.status] ?? STATUS_STYLES.pending
  const rd = event.request_details

  const title = event.agency_name
    ? (event.agent_name ? `${event.agent_name} at ${event.agency_name}` : event.agency_name)
    : (event.agent_name ?? 'Unknown')

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', maxWidth: 800 }}>
      <a href="/admin/events" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Events</a>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', margin: '16px 0 24px' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>{title}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {formatDate(event.event_date)}
            <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
            Saved {formatCreated(event.created_at)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            display: 'inline-block', padding: '4px 10px',
            fontSize: 12, fontWeight: 500, borderRadius: 4,
            background: st.bg, color: st.color,
          }}>
            {st.label}
          </span>
          <a
            href={`/admin/events/${event.id}/email`}
            style={{
              display: 'inline-block', padding: '8px 18px', fontSize: 13, fontWeight: 500,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', textDecoration: 'none',
            }}
          >
            Generate email
          </a>
          <a
            href={`/quote/new?event=${event.id}`}
            style={{
              display: 'inline-block', padding: '8px 18px', fontSize: 13, fontWeight: 500,
              background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
            }}
          >
            Generate quote →
          </a>
        </div>
      </div>

      {/* Event details */}
      <Section label="Event details">
        <PairGrid>
          <Cell label="Agency" value={event.agency_name} />
          <Cell label="Agent" value={event.agent_name} />
          <Cell label="Date" value={formatDate(event.event_date)} />
          <Cell label="Client email" value={event.client_email} />
          <Cell label="Arrival" value={event.arrival_time} />
          <Cell label="Start" value={event.start_time} />
          <Cell label="Finish" value={event.finish_time} />
          <Cell label="Load out" value={event.load_out_time} />
        </PairGrid>
        <PairGrid style={{ borderBottom: 'none' }}>
          <Cell label="Venue" value={event.venue_name} />
          <Cell label="Guests" value={event.guests != null ? String(event.guests) : null} />
          <Cell label="Postcode" value={event.venue_postcode} />
          <Cell label="Location" value={event.location} />
        </PairGrid>
        <FullRow label="Address" value={event.venue_address} />
      </Section>

      {/* Request details */}
      {rd && (
        <Section label="Request details">
          <PairGrid>
            <Cell label="Band size requested" value={rd.band_size_requested} />
            <Cell label="Sets requested" value={rd.sets_requested} />
          </PairGrid>
          <FullRow label="Special requirements" value={rd.special_requirements} />
          <FullRow label="Sound requirements" value={rd.sound_requirements} />
          <FullRow label="Notes" value={rd.notes} />
        </Section>
      )}

      {/* Associated quotes */}
      <Section label={`Quotes (${quotes.length})`}>
        {quotes.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '8px 0 12px' }}>No quotes yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
            {quotes.map(q => {
              const inp = q.inputs as { agency_name?: string | null; event_date?: string | null }
              return (
                <a
                  key={q.id}
                  href={`/quote/${q.id}`}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', textDecoration: 'none',
                    background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>
                    Quote — {formatDate(inp.event_date ?? null)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {formatCreated(q.created_at)}
                  </span>
                </a>
              )
            })}
          </div>
        )}
      </Section>

      {/* Raw email */}
      {event.raw_email && (
        <details style={{ marginTop: 24 }}>
          <summary style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            cursor: 'pointer', marginBottom: 10, userSelect: 'none',
          }}>
            Original email
          </summary>
          <pre style={{
            fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '14px 16px', margin: 0,
          }}>
            {event.raw_email}
          </pre>
        </details>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        background: 'var(--bg)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '0 16px',
      }}>
        {children}
      </div>
    </div>
  )
}

function PairGrid({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px',
      borderBottom: '0.5px solid var(--border)',
      ...style,
    }}>
      {children}
    </div>
  )
}
