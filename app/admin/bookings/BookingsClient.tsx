'use client'

import { useState } from 'react'
import type { EventRecord } from '@/types/quote'
import { STATUS_MAP } from '@/lib/event-statuses'
import type { EventStatus } from '@/lib/event-statuses'

function formatDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function BookingRow({ ev }: { ev: EventRecord }) {
  const name = ev.agency_name || ev.agent_name || '—'
  const agent = ev.agency_name && ev.agent_name ? ev.agent_name : null
  const rd = ev.request_details
  const requestSummary = [rd?.band_size_requested, rd?.sets_requested].filter(Boolean).join(' · ') || '—'
  const times = [ev.start_time, ev.finish_time].filter(Boolean).join(' – ') || '—'
  const st = STATUS_MAP[ev.status as EventStatus] ?? STATUS_MAP['confirmed_stc']

  return (
    <a
      href={`/admin/events/${ev.id}`}
      style={{
        display: 'grid', gridTemplateColumns: '140px 1fr 1fr 130px 120px',
        padding: '14px 16px', gap: 16, textDecoration: 'none',
        background: 'var(--bg)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)', alignItems: 'center',
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{formatDate(ev.event_date)}</div>
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
}

function EventList({ events, emptyText }: { events: EventRecord[]; emptyText: string }) {
  if (events.length === 0) {
    return (
      <div style={{
        padding: '32px 24px', textAlign: 'center',
        color: 'var(--text-tertiary)', fontSize: 13,
        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
      }}>
        {emptyText}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '140px 1fr 1fr 130px 120px',
        padding: '8px 16px', gap: 16,
        fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        <div>Date</div>
        <div>Agency / Agent</div>
        <div>Request</div>
        <div>Times</div>
        <div>Status</div>
      </div>
      {events.map(ev => <BookingRow key={ev.id} ev={ev} />)}
    </div>
  )
}

export default function BookingsClient({ future, past }: { future: EventRecord[]; past: EventRecord[] }) {
  const [showPast, setShowPast] = useState(false)

  return (
    <div>
      <EventList events={future} emptyText="No upcoming bookings." />

      <div style={{ marginTop: 32 }}>
        <button
          onClick={() => setShowPast(v => !v)}
          style={{
            padding: '7px 14px', fontSize: 13, fontWeight: 500,
            background: 'var(--bg)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            color: 'var(--text-secondary)', fontFamily: 'var(--font)',
          }}
        >
          {showPast ? 'Hide past bookings' : `Show past bookings (${past.length})`}
        </button>

        {showPast && past.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
            }}>
              Past
            </div>
            <EventList events={[...past].reverse()} emptyText="No past bookings." />
          </div>
        )}
      </div>
    </div>
  )
}
