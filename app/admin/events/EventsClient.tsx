'use client'

import { useState, useTransition } from 'react'
import type { EventRecord } from '@/types/quote'
import { EVENT_STATUSES, STATUS_MAP } from '@/lib/event-statuses'
import type { EventStatus } from '@/lib/event-statuses'
import { updateEventStatus } from './actions'

function formatDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const st = STATUS_MAP[status as EventStatus] ?? STATUS_MAP['enquiry']
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px',
      fontSize: 12, fontWeight: 500, borderRadius: 6,
      background: st.bg, color: st.color, whiteSpace: 'nowrap',
    }}>
      {st.label}
    </span>
  )
}

function BandStatusBadge({ eventMusicians }: { eventMusicians?: { id: string; musician_id: string | null }[] | null }) {
  const slots = eventMusicians ?? []
  if (slots.length === 0) return null
  const allFilled = slots.every(s => s.musician_id)
  if (!allFilled) return null
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 6, background: 'var(--pill-stc-bg)', color: 'var(--pill-stc-text)', whiteSpace: 'nowrap' }}>
      Booked
    </span>
  )
}

function InvoiceBadge({ invoices, status }: { invoices?: { id: string; status: string }[] | null; status: string }) {
  const CONFIRMED: string[] = ['confirmed_stc', 'contracted']
  if (!CONFIRMED.includes(status)) return null
  const list = invoices ?? []
  if (list.length === 0) {
    return (
      <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 6, background: 'var(--pill-uninvoiced-bg)', color: 'var(--pill-uninvoiced-text)' }}>
        Not invoiced
      </span>
    )
  }
  const allPaid = list.every(i => i.status === 'paid')
  return (
    <span style={{
      fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6,
      background: allPaid ? 'var(--pill-paid-bg)' : 'var(--pill-outstanding-bg)',
      color: allPaid ? 'var(--pill-paid-text)' : 'var(--pill-outstanding-text)',
    }}>
      {allPaid ? 'Paid' : 'Outstanding'}
    </span>
  )
}

function EventRow({ ev }: { ev: EventRecord }) {
  const name = ev.agency_name || ev.agent_name || '—'
  const agent = ev.agency_name && ev.agent_name ? ev.agent_name : null
  const rd = ev.request_details
  const requestSummary = [rd?.band_size_requested, rd?.sets_requested].filter(Boolean).join(' · ') || '—'
  const times = [ev.start_time, ev.finish_time].filter(Boolean).join(' – ') || '—'

  return (
    <a
      href={`/admin/events/${ev.id}`}
      style={{
        display: 'grid', gridTemplateColumns: '140px 1fr 1fr 120px 120px 90px 110px',
        padding: '12px 16px', gap: 16, textDecoration: 'none',
        background: 'var(--bg)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)', alignItems: 'center',
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{formatDate(ev.event_date)}</div>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{name}</div>
        {agent && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{agent}</div>}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 400 }}>{ev.venue_name || '—'}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{times}</div>
      <div><StatusBadge status={ev.status} /></div>
      <div><BandStatusBadge eventMusicians={ev.event_musicians} /></div>
      <div><InvoiceBadge invoices={ev.invoices} status={ev.status} /></div>
    </a>
  )
}

function KanbanCard({ ev }: { ev: EventRecord }) {
  const [isPending, startTransition] = useTransition()
  const name = ev.agency_name || ev.agent_name || '—'
  const rd = ev.request_details
  const requestSummary = [rd?.band_size_requested, rd?.sets_requested].filter(Boolean).join(' · ')

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.preventDefault()
    const next = e.target.value as EventStatus
    startTransition(() => { updateEventStatus(ev.id, next) })
  }

  return (
    <div style={{
      background: 'var(--bg)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '12px 14px',
      opacity: isPending ? 0.5 : 1,
    }}>
      <a
        href={`/admin/events/${ev.id}`}
        style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{name}</div>
        {ev.agent_name && ev.agency_name && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{ev.agent_name}</div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{formatDate(ev.event_date)}</div>
        {requestSummary && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>{requestSummary}</div>
        )}
      </a>
      <select
        value={ev.status}
        onChange={handleStatusChange}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', padding: '4px 6px', fontSize: 11, fontWeight: 500,
          border: '0.5px solid var(--border)', borderRadius: 4,
          background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
          cursor: 'pointer', outline: 'none', fontFamily: 'var(--font)',
        }}
      >
        {EVENT_STATUSES.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  )
}

const CONFIRMED_STATUSES: EventStatus[] = ['confirmed_stc', 'contracted']

type FilterMode = 'all' | 'confirmed'

export default function EventsClient({ events }: { events: EventRecord[] }) {
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [includePast, setIncludePast] = useState(true)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filtered = events
    .filter(ev => {
      if (filter === 'confirmed' && !CONFIRMED_STATUSES.includes(ev.status as EventStatus)) return false
      if (!includePast && ev.event_date && new Date(ev.event_date) < today) return false
      return true
    })
    .sort((a, b) => {
      const da = a.event_date ?? '9999-99-99'
      const db = b.event_date ?? '9999-99-99'
      return sortDir === 'asc' ? da.localeCompare(db) : db.localeCompare(da)
    })

  const btnBase: React.CSSProperties = {
    padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font)',
  }

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    border: `0.5px solid ${active ? 'var(--border-info)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)',
    background: active ? 'var(--bg-info)' : 'var(--bg)',
    color: active ? 'var(--text-info)' : 'var(--text-secondary)',
    transition: 'all 0.1s',
  })

  return (
    <div>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Show:</span>
          <button onClick={() => setFilter('all')} style={filterBtnStyle(filter === 'all')}>All</button>
          <button onClick={() => setFilter('confirmed')} style={filterBtnStyle(filter === 'confirmed')}>Confirmed</button>
        </div>

        {/* Include past toggle */}
        <div
            onClick={() => setIncludePast(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '5px 12px',
              border: `0.5px solid ${!includePast ? 'var(--border-info)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: !includePast ? 'var(--bg-info)' : 'var(--bg)',
              userSelect: 'none', transition: 'all 0.1s',
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: 3, flexShrink: 0,
              border: `1.5px solid ${!includePast ? 'var(--text-info)' : 'var(--border-hover)'}`,
              background: !includePast ? 'var(--text-info)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {!includePast && (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 13, color: includePast ? 'var(--text-secondary)' : 'var(--text-info)' }}>Upcoming only</span>
          </div>

        {/* Spacer + view toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={() => setView('list')}
            style={{ ...btnBase, background: view === 'list' ? 'var(--text)' : 'var(--bg)', color: view === 'list' ? 'var(--bg)' : 'var(--text-secondary)' }}
          >
            List
          </button>
          <button
            onClick={() => setView('kanban')}
            style={{ ...btnBase, background: view === 'kanban' ? 'var(--text)' : 'var(--bg)', color: view === 'kanban' ? 'var(--bg)' : 'var(--text-secondary)' }}
          >
            Kanban
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '140px 1fr 1fr 120px 120px 90px 110px',
            padding: '8px 16px', gap: 16,
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <div
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Date {sortDir === 'asc' ? '↑' : '↓'}
            </div>
            <div>Agency / Agent</div>
            <div>Venue</div>
            <div>Times</div>
            <div>Status</div>
            <div>Band</div>
            <div>Invoice</div>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
              No events
            </div>
          ) : (
            filtered.map(ev => <EventRow key={ev.id} ev={ev} />)
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${EVENT_STATUSES.length}, minmax(200px, 1fr))`,
          gap: 12,
          paddingBottom: 16,
        }}>
          {EVENT_STATUSES.map(status => {
            const cols = filtered.filter(ev => (ev.status ?? 'enquiry') === status.value)
            return (
              <div key={status.value}>
                <div style={{
                  padding: '6px 10px', marginBottom: 8,
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.06em', borderRadius: 4,
                  background: status.bg, color: status.color,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>{status.label}</span>
                  <span style={{ opacity: 0.7 }}>{cols.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cols.length === 0 ? (
                    <div style={{
                      padding: '20px 12px', textAlign: 'center',
                      fontSize: 12, color: 'var(--text-tertiary)',
                      border: '0.5px dashed var(--border)', borderRadius: 'var(--radius-md)',
                    }}>
                      —
                    </div>
                  ) : (
                    cols.map(ev => <KanbanCard key={ev.id} ev={ev} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
