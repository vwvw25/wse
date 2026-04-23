'use client'

import React, { useState } from 'react'
import type { QuoteRecord } from '@/types/quote'

function fmt(n: number) {
  return '£' + Math.round(n).toLocaleString('en-GB')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 500, fontSize: 12 }
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'top' }

export default function QuotesTable({ quotes }: { quotes: QuoteRecord[] }) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? quotes.filter(q => {
        const s = search.toLowerCase()
        return (
          (q.inputs.agency_name ?? '').toLowerCase().includes(s) ||
          (q.inputs.agent_name ?? '').toLowerCase().includes(s)
        )
      })
    : quotes

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by agency or agent name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            fontFamily: 'var(--font)',
            background: 'var(--bg)',
            color: 'var(--text)',
            width: 280,
            outline: 'none',
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
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={th}>Created</th>
              <th style={th}>Event date</th>
              <th style={th}>Client / agency</th>
              <th style={th}>Band</th>
              <th style={th}>Prices</th>
              <th style={th}>Ver</th>
              <th style={th}>Status</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(q => {
              const inp = q.inputs
              const calc = q.calculated
              const prices = (calc.price_options ?? []).map(o => o.total_price)
              const minP = prices.length ? Math.min(...prices) : null
              const maxP = prices.length ? Math.max(...prices) : null
              const priceStr = minP == null || maxP == null ? '—'
                : minP === maxP ? fmt(minP)
                : `${fmt(minP)} – ${fmt(maxP)}`

              const bandSizes = inp.band_sizes?.length ? inp.band_sizes : (inp.band_size ? [inp.band_size] : [])
              const setConfigs = inp.set_configs?.length ? inp.set_configs : (inp.set_config ? [inp.set_config] : [])
              const client = [inp.agency_name, inp.agent_name].filter(Boolean).join(' / ') || '—'

              return (
                <tr key={q.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <td style={td}>{fmtDate(q.created_at)}</td>
                  <td style={td}>
                    {inp.event_date
                      ? fmtDate(inp.event_date)
                      : <span style={{ color: 'var(--text-tertiary)' }}>TBC</span>}
                  </td>
                  <td style={td}>{client}</td>
                  <td style={td}>
                    <span style={{ fontSize: 12 }}>
                      {bandSizes.map(s => s.replace(/_/g, ' ')).join(', ') || '—'}
                      {setConfigs.length > 0 && (
                        <span style={{ color: 'var(--text-secondary)' }}> · {setConfigs.join(', ')}</span>
                      )}
                    </span>
                  </td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{priceStr}</td>
                  <td style={td}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      v{(q as QuoteRecord & { version?: number }).version ?? 1}
                    </span>
                  </td>
                  <td style={td}>
                    {(() => {
                      const status = (q as QuoteRecord & { status?: string }).status ?? 'sent'
                      const styles: Record<string, React.CSSProperties> = {
                        accepted:   { background: '#f0fdf4', color: '#16a34a', border: '0.5px solid #bbf7d0' },
                        superseded: { background: '#f9fafb', color: '#9ca3af', border: '0.5px solid #e5e7eb' },
                        draft:      { background: '#f3f4f6', color: '#374151', border: '0.5px solid #e5e7eb' },
                        sent:       { background: '#eff6ff', color: '#1d4ed8', border: '0.5px solid #bfdbfe' },
                      }
                      return (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, textTransform: 'capitalize', ...(styles[status] ?? styles.sent) }}>
                          {status}
                        </span>
                      )
                    })()}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <a
                      href={`/admin/quotes/${q.id}`}
                      style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}
                    >
                      Audit →
                    </a>
                    {' '}
                    <a
                      href={`/quote/${q.id}`}
                      style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', marginLeft: 8 }}
                    >
                      Quote ↗
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 24, textAlign: 'center' }}>
            {search ? 'No quotes match your search.' : 'No quotes yet.'}
          </p>
        )}
      </div>
    </div>
  )
}
