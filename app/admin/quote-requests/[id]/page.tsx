import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { QuoteRecord, BookingType } from '@/types/quote'
import React from 'react'

export const dynamic = 'force-dynamic'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtCreated(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmt(n: number) {
  return '£' + Math.round(n).toLocaleString('en-GB')
}

const BOOKING_TYPE_LABELS: Record<string, string> = {
  background: 'Background',
  dancing_under_40: 'Dancing <40',
  dancing_over_40: 'Dancing >40',
  wedding: 'Wedding',
}

const TRAVEL_TYPE_LABELS: Record<string, string> = {
  london_based: 'London based',
  uk: 'UK day trip',
  domestic_overnight: 'UK overnight',
  international: 'International',
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3, letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? 'var(--text)' : 'var(--text-tertiary)' }}>{value || '—'}</div>
    </div>
  )
}

function PairGrid({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', borderBottom: '0.5px solid var(--border)', ...style }}>
      {children}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '0 16px' }}>
        {children}
      </div>
    </div>
  )
}

export default async function QuoteRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('quote_requests')
    .select('*, event:events(id, agency_name, agent_name, event_date, venue_name, status), quotes(id, created_at, inputs, calculated, status, version)')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const af = data.auto_fill as Record<string, unknown>
  const rd = data.request_details as Record<string, unknown> | null
  const event = data.event as { id: string; agency_name: string | null; agent_name: string | null; event_date: string | null; venue_name: string | null; status: string | null } | null
  const quotes = (data.quotes ?? []) as (Pick<QuoteRecord, 'id' | 'created_at' | 'inputs' | 'calculated'> & { status: string; version: number })[]

  const bookingTypes = (af.booking_types as string[]) ?? []
  const travelType = af.travel_type as string | null

  // Build URL for generating a new quote from this request
  const quoteParams = new URLSearchParams()
  quoteParams.set('request', id)
  if (data.event_id) quoteParams.set('event', data.event_id)

  const title = [(af.agent_name as string | null) ?? event?.agent_name, (af.agency_name as string | null) ?? event?.agency_name]
    .filter(Boolean).join(' · ') || 'Unknown'

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <a href="/admin/quotes" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Quotes</a>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', margin: '16px 0 28px' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>{title}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {fmtDate((af.event_date as string | null) ?? event?.event_date ?? null)}
            <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
            Created {fmtCreated(data.created_at)}
          </p>
        </div>
        <a
          href={`/quote/new?${quoteParams.toString()}`}
          style={{
            display: 'inline-block', padding: '8px 20px', fontSize: 13, fontWeight: 500,
            background: 'var(--accent)', color: 'var(--accent-text-on)', borderRadius: 'var(--radius-sm)', textDecoration: 'none',
          }}
        >
          Generate quote →
        </a>
      </div>

      {/* Request details */}
      <Section label="Request details">
        <PairGrid>
          <Field label="Agency" value={(af.agency_name as string | null) ?? event?.agency_name ?? null} />
          <Field label="Agent" value={(af.agent_name as string | null) ?? event?.agent_name ?? null} />
          <Field label="Event date" value={fmtDate((af.event_date as string | null) ?? event?.event_date ?? null)} />
          <Field label="Venue" value={(af.venue_name as string | null) ?? event?.venue_name} />
        </PairGrid>
        <PairGrid>
          <Field label="Arrival" value={af.arrival_time as string | null} />
          <Field label="Start" value={af.start_time as string | null} />
          <Field label="Finish" value={af.finish_time as string | null} />
          <Field label="Load out" value={af.load_out_time as string | null} />
        </PairGrid>
        <PairGrid>
          <Field label="Location" value={af.location as string | null} />
          <Field label="Guests" value={af.guests != null ? String(af.guests) : null} />
          <Field label="Postcode" value={af.venue_postcode as string | null} />
          <Field label="Booking type" value={bookingTypes.map(bt => BOOKING_TYPE_LABELS[bt] ?? bt).join(', ') || null} />
        </PairGrid>
        <PairGrid style={{ borderBottom: 'none' }}>
          <Field label="Travel" value={travelType ? (TRAVEL_TYPE_LABELS[travelType] ?? travelType) : null} />
          <Field label="Address" value={af.venue_address as string | null} />
        </PairGrid>
      </Section>

      {/* What was requested */}
      {rd && (
        <Section label="What was asked for">
          <PairGrid>
            <Field label="Band size requested" value={rd.band_size_requested as string | null} />
            <Field label="Sets requested" value={rd.sets_requested as string | null} />
            <Field label="Special requirements" value={rd.special_requirements as string | null} />
            <Field label="Sound requirements" value={rd.sound_requirements as string | null} />
          </PairGrid>
          {!!rd.notes && (
            <div style={{ padding: '10px 0', borderTop: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3 }}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{String(rd.notes)}</div>
            </div>
          )}
        </Section>
      )}

      {/* Linked event */}
      {event && (
        <Section label="Event">
          <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>
              {event.agency_name ?? event.agent_name ?? 'Event'}
              {event.event_date && <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{fmtDate(event.event_date)}</span>}
            </div>
            <a href={`/admin/events/${event.id}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
              View event →
            </a>
          </div>
        </Section>
      )}

      {/* Quotes */}
      <Section label={`Quotes (${quotes.length})`}>
        {quotes.length === 0 ? (
          <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
            No quotes generated yet.
          </div>
        ) : (
          <div>
            {quotes
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map(q => {
                const prices = (q.calculated?.price_options ?? []).map((o: { total_price: number }) => o.total_price)
                const minP = prices.length ? Math.min(...prices) : null
                const maxP = prices.length ? Math.max(...prices) : null
                const priceStr = minP == null || maxP == null ? '—' : minP === maxP ? fmt(minP) : `${fmt(minP)} – ${fmt(maxP)}`
                const statusStyles: Record<string, React.CSSProperties> = {
                  accepted:   { background: 'var(--pill-stc-bg)',        color: 'var(--pill-stc-text)' },
                  superseded: { background: 'var(--pill-uninvoiced-bg)', color: 'var(--pill-uninvoiced-text)' },
                  sent:       { background: 'var(--pill-enquiry-bg)',    color: 'var(--pill-enquiry-text)' },
                }
                return (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '0.5px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{fmtCreated(q.created_at)}</span>
                      <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>{priceStr}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>v{q.version ?? 1}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, textTransform: 'capitalize', ...(statusStyles[q.status] ?? statusStyles.sent) }}>
                        {q.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <a href={`/quote/${q.id}`} style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>View ↗</a>
                      <a href={`/admin/quotes/${q.id}`} style={{ fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}>Audit →</a>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </Section>
    </div>
  )
}
