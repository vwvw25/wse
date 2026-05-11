'use client'

import React, { useState, useMemo } from 'react'
import type { EventRecord } from '@/types/quote'
import { STATUS_MAP } from '@/lib/event-statuses'
import type { EventStatus } from '@/lib/event-statuses'
import type { EventMusician, Musician } from '@/types/musicians'
import { musicianFullName } from '@/types/musicians'

interface EventWithMusicians extends Pick<EventRecord, 'id' | 'agency_name' | 'agent_name' | 'event_date' | 'status'> {
  slots: EventMusician[]
}

interface Props {
  events: EventWithMusicians[]
  musicians: Musician[]
}

function formatDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Preferred instrument column order
const INSTRUMENT_ORDER = [
  'Vocals', 'Vocal', 'Lead Vocals', 'Lead Vocal',
  'Guitar', 'Lead Guitar', 'Rhythm Guitar', 'Bass Guitar', 'Bass',
  'Drums', 'Keyboards', 'Keyboard', 'Keys',
  'Saxophone', 'Alto Saxophone', 'Tenor Saxophone', 'Baritone Saxophone',
  'Trumpet', 'Trombone', 'Tuba',
  'Violin', 'Cello',
  'Extras',
]

function instrumentSortKey(name: string): number {
  const idx = INSTRUMENT_ORDER.findIndex(i => i.toLowerCase() === name.toLowerCase())
  return idx >= 0 ? idx : INSTRUMENT_ORDER.length
}

export default function BandBuilderClient({ events, musicians }: Props) {
  const [search, setSearch] = useState('')

  // Derive sorted column list from all slots across all events
  const instruments = useMemo(() => {
    const set = new Set<string>()
    events.forEach(ev => ev.slots.forEach(s => set.add(s.instrument)))
    return [...set].sort((a, b) => {
      const ka = instrumentSortKey(a)
      const kb = instrumentSortKey(b)
      if (ka !== kb) return ka - kb
      return a.localeCompare(b)
    })
  }, [events])

  const filteredEvents = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return events
    return events.filter(ev => {
      const label = [ev.agency_name, ev.agent_name].filter(Boolean).join(' ').toLowerCase()
      return label.includes(q) || (ev.event_date ?? '').includes(q)
    })
  }, [events, search])

  if (events.length === 0) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        No events with musician slots yet. Go to an event and assign musicians.
      </div>
    )
  }

  const musicianById = Object.fromEntries(musicians.map(m => [m.id, m]))

  return (
    <div>
      {/* Search + count */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events…"
          style={{
            height: 34, padding: '0 10px', fontSize: 13, width: 280, boxSizing: 'border-box',
            background: 'var(--bg-secondary)', color: 'var(--text)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font)', outline: 'none',
          }}
        />
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Overview table */}
      <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: 180 }}>
                Event
              </th>
              {instruments.map(inst => (
                <th key={inst} style={{ textAlign: 'center', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: 110 }}>
                  {inst}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map(ev => {
              const statusEntry = STATUS_MAP[ev.status as EventStatus] ?? STATUS_MAP['enquiry']
              const label = ev.agency_name
                ? (ev.agent_name ? `${ev.agent_name} at ${ev.agency_name}` : ev.agency_name)
                : (ev.agent_name ?? 'Unknown')

              // Build a map of instrument → slot for this event
              const slotByInstrument: Record<string, EventMusician> = {}
              ev.slots.forEach(s => { slotByInstrument[s.instrument] = s })

              return (
                <tr key={ev.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {/* Event name + status */}
                  <td style={{ padding: '10px 16px', verticalAlign: 'middle' }}>
                    <a
                      href={`/admin/events/${ev.id}/musicians`}
                      style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none', display: 'block', marginBottom: 4 }}
                    >
                      {label}
                    </a>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{formatDate(ev.event_date)}</span>
                      <span style={{
                        display: 'inline-block', padding: '2px 6px',
                        fontSize: 10, fontWeight: 500, borderRadius: 3,
                        background: statusEntry.bg, color: statusEntry.color,
                      }}>
                        {statusEntry.label}
                      </span>
                    </div>
                  </td>

                  {/* One cell per instrument column */}
                  {instruments.map(inst => {
                    const slot = slotByInstrument[inst]
                    if (!slot) {
                      // This event doesn't have this instrument in its lineup
                      return (
                        <td key={inst} style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                          —
                        </td>
                      )
                    }

                    const musician = slot.musician_id ? musicianById[slot.musician_id] : null
                    const avail = slot.availability

                    if (!musician) {
                      return (
                        <td key={inst} style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>MISSING</span>
                        </td>
                      )
                    }

                    const color = avail === 'yes' ? '#16a34a' : avail === 'no' ? '#dc2626' : 'var(--text-secondary)'
                    const prefix = avail === 'yes' ? '✓ ' : avail === 'no' ? '✗ ' : ''

                    return (
                      <td key={inst} style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, color, fontWeight: avail === 'yes' ? 500 : 400 }}>
                          {prefix}{musicianFullName(musician)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-tertiary)' }}>
        <span style={{ color: '#16a34a' }}>✓ Confirmed available</span>
        <span style={{ color: '#dc2626' }}>✗ Unavailable</span>
        <span>◌ TBC (name shown, no prefix)</span>
        <span style={{ color: '#dc2626', fontWeight: 600 }}>MISSING = slot exists but no one assigned</span>
        <span>— = instrument not in this event's lineup</span>
      </div>
    </div>
  )
}
