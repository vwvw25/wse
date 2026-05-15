'use client'

import React, { useState } from 'react'
import type { QuoteRequest } from './page'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 500, fontSize: 12, textAlign: 'left' }
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'top' }

export default function QuoteRequestsTable({ rows }: { rows: QuoteRequest[] }) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? rows.filter(r => {
        const s = search.toLowerCase()
        const af = r.auto_fill
        return (
          ((af.agency_name as string) ?? '').toLowerCase().includes(s) ||
          ((af.agent_name as string) ?? '').toLowerCase().includes(s) ||
          ((af.venue_name as string) ?? '').toLowerCase().includes(s)
        )
      })
    : rows

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by agency, agent or venue…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 12px', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'var(--font)',
            background: 'var(--bg)', color: 'var(--text)', width: 280, outline: 'none',
          }}
        />
        {search && (
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 12 }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <th style={th}>Created</th>
              <th style={th}>Event date</th>
              <th style={th}>Client / agency</th>
              <th style={th}>Venue</th>
              <th style={th}>Requested</th>
              <th style={th}>Quotes</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const af = r.auto_fill
              const rd = r.request_details
              const agency = (af.agency_name as string | null) ?? r.event?.agency_name
              const agent = (af.agent_name as string | null) ?? r.event?.agent_name
              const client = [agency, agent].filter(Boolean).join(' / ') || '—'
              const eventDate = (af.event_date as string | null) ?? r.event?.event_date
              const venue = (af.venue_name as string | null) ?? r.event?.venue_name
              const bandSize = rd?.band_size_requested as string | null
              const sets = rd?.sets_requested as string | null
              const quoteCount = r.quotes?.length ?? 0
              const hasAccepted = r.quotes?.some(q => q.status === 'accepted')

              return (
                <tr
                  key={r.id}
                  style={{ borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => window.location.href = `/admin/quote-requests/${r.id}`}
                >
                  <td style={td}>{fmtDate(r.created_at)}</td>
                  <td style={td}>
                    {eventDate
                      ? fmtDate(eventDate)
                      : <span style={{ color: 'var(--text-tertiary)' }}>TBC</span>}
                  </td>
                  <td style={td}>{client}</td>
                  <td style={{ ...td, color: venue ? 'var(--text)' : 'var(--text-tertiary)' }}>
                    {venue ?? '—'}
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {[bandSize, sets].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </td>
                  <td style={td}>
                    {quoteCount === 0
                      ? <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>None</span>
                      : (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                          ...(hasAccepted
                            ? { background: '#f0fdf4', color: '#16a34a', border: '0.5px solid #bbf7d0' }
                            : { background: '#eff6ff', color: '#1d4ed8', border: '0.5px solid #bfdbfe' }),
                        }}>
                          {quoteCount} {hasAccepted ? '· accepted' : ''}
                        </span>
                      )}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <a
                      href={`/admin/quote-requests/${r.id}`}
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}
                    >
                      View →
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 24, textAlign: 'center' }}>
            {search ? 'No quote requests match your search.' : 'No quote requests yet.'}
          </p>
        )}
      </div>
    </div>
  )
}
