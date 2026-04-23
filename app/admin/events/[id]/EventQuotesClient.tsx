'use client'

import React, { useState } from 'react'
import type { PriceOption } from '@/types/quote'

type QuoteSummary = {
  id: string
  created_at: string
  version: number
  status: string
  accepted_option: string | null
  inputs: {
    agency_name?: string | null
    agent_name?: string | null
    event_date?: string | null
  }
  calculated: {
    price_options?: PriceOption[]
  }
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  draft:      { background: '#f3f4f6', color: '#374151', border: '0.5px solid #e5e7eb' },
  sent:       { background: '#eff6ff', color: '#1d4ed8', border: '0.5px solid #bfdbfe' },
  superseded: { background: '#f9fafb', color: '#9ca3af', border: '0.5px solid #e5e7eb' },
  accepted:   { background: 'transparent', color: '#16a34a', border: '0.5px solid #16a34a' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.sent
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize' }}>
      {status}
    </span>
  )
}

function fmt(n: number) { return '£' + Math.round(n).toLocaleString('en-GB') }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function optionLabel(opt: PriceOption): string {
  return [
    opt.line_up || opt.band_size,
    opt.set_config?.replace('x', '×'),
    opt.total_price != null ? fmt(opt.total_price) : null,
  ].filter(Boolean).join(' — ')
}

function AcceptedBreakdown({ opt }: { opt: PriceOption }) {
  const rows: [string, number][] = [
    ['Musician fees', opt.sum_musician_fees],
    ['Performance fee', opt.performance_fee],
    ['PA', opt.pa_cost ?? 0],
    ['Travel', opt.travel_cost ?? 0],
  ]
  return (
    <div style={{ margin: '0 16px 14px', borderRadius: 6, overflow: 'hidden', border: '0.5px solid var(--border)' }}>
      <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.01em' }}>
        {opt.line_up || opt.band_size} · {opt.set_config?.replace('x', '×')}
      </div>
      {rows.filter(([, v]) => v !== 0).map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{fmt(value)}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', fontSize: 14, fontWeight: 700, borderTop: '0.5px solid var(--border)' }}>
        <span style={{ color: 'var(--text)' }}>Total</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{fmt(opt.total_price)}</span>
      </div>
    </div>
  )
}

export default function EventQuotesClient({
  eventId,
  quotes: initial,
}: {
  eventId: string
  quotes: QuoteSummary[]
}) {
  const [quotes, setQuotes] = useState(initial)
  const [creatingFrom, setCreatingFrom] = useState<string | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [unaccepting, setUnaccepting] = useState<string | null>(null)

  async function handleNewVersion(quoteId: string) {
    setCreatingFrom(quoteId)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/new-version`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        window.location.href = `/quote/new/details?edit=${data.id}`
      }
    } finally {
      setCreatingFrom(null)
    }
  }

  async function handleAccept(quoteId: string, label: string, opt: PriceOption) {
    setAccepting(`${quoteId}:${label}`)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted_option: label }),
      })
      if (res.ok) {
        setQuotes(prev => prev.map(q =>
          q.id === quoteId ? { ...q, status: 'accepted', accepted_option: label, _acceptedOpt: opt } : q
        ) as QuoteSummary[])
      }
    } finally {
      setAccepting(null)
    }
  }

  async function handleUnaccept(quoteId: string) {
    setUnaccepting(quoteId)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/accept`, { method: 'DELETE' })
      if (res.ok) {
        setQuotes(prev => prev.map(q =>
          q.id === quoteId ? { ...q, status: 'sent', accepted_option: null } : q
        ))
      }
    } finally {
      setUnaccepting(null)
    }
  }

  if (quotes.length === 0) {
    return (
      <div style={{ padding: '16px 0' }}>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 14px' }}>No quotes yet.</p>
        <a
          href={`/quote/new?event=${eventId}`}
          style={{
            display: 'inline-block', padding: '8px 18px', fontSize: 13, fontWeight: 500,
            background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', textDecoration: 'none',
          }}
        >
          Generate quote →
        </a>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {quotes.map((q, i) => {
        const options = q.calculated.price_options ?? []
        const isSuperseded = q.status === 'superseded'
        const isAccepted = q.status === 'accepted'
        const isNewest = i === 0
        const canAccept = !isSuperseded && !isAccepted

        // Find the accepted PriceOption object
        const acceptedOpt = isAccepted && q.accepted_option
          ? options.find(o => optionLabel(o) === q.accepted_option) ?? null
          : null

        return (
          <div key={q.id} style={{ position: 'relative', marginBottom: 12, paddingTop: isAccepted ? 32 : 0 }}>

            {/* "Change" button floated above top-right of card */}
            {isAccepted && (
              <button
                onClick={() => handleUnaccept(q.id)}
                disabled={unaccepting === q.id}
                style={{
                  position: 'absolute', top: 0, right: 0,
                  fontSize: 12, color: 'var(--text-secondary)',
                  background: 'none', border: '0.5px solid var(--border)',
                  borderRadius: 4, padding: '3px 10px',
                  cursor: unaccepting === q.id ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font)', opacity: unaccepting === q.id ? 0.5 : 1,
                }}
              >
                {unaccepting === q.id ? 'Undoing…' : 'Change accepted quote'}
              </button>
            )}

          <div
            style={{
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: isSuperseded ? 'var(--bg-secondary)' : 'var(--bg)',
              opacity: isSuperseded ? 0.6 : 1,
              overflow: 'hidden',
            }}
          >
            {/* Card header */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: '0.5px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                Version {q.version}
              </span>
              <StatusBadge status={q.status} />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                {fmtDate(q.created_at)}
              </span>
            </div>

            {/* Accepted: show just the breakdown of the accepted option */}
            {isAccepted && acceptedOpt ? (
              <div style={{ paddingTop: 14 }}>
                <AcceptedBreakdown opt={acceptedOpt} />
              </div>
            ) : (
              /* Not accepted: show all options as rows */
              <div>
                {options.map((opt, idx) => {
                  const label = optionLabel(opt)
                  const isThisAccepting = accepting === `${q.id}:${label}`

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px',
                        borderBottom: idx < options.length - 1 ? '0.5px solid var(--border)' : undefined,
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                        {opt.line_up || opt.band_size.replace(/_/g, ' ')}
                        <span style={{ color: 'var(--text-secondary)' }}> · {opt.set_config?.replace('x', '×')}</span>
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', minWidth: 70, textAlign: 'right' }}>
                        {opt.total_price != null ? fmt(opt.total_price) : '—'}
                      </span>
                      {canAccept ? (
                        <button
                          onClick={() => handleAccept(q.id, label, opt)}
                          disabled={!!accepting}
                          style={{
                            fontSize: 12, color: '#16a34a',
                            background: 'none', border: '0.5px solid var(--border)',
                            borderRadius: 4, padding: '3px 10px',
                            cursor: accepting ? 'not-allowed' : 'pointer',
                            opacity: accepting && !isThisAccepting ? 0.5 : 1,
                            fontFamily: 'var(--font)', minWidth: 90,
                          }}
                        >
                          {isThisAccepting ? 'Saving…' : 'Mark accepted'}
                        </button>
                      ) : (
                        <span style={{ minWidth: 90 }} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Card footer */}
            <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <a href={`/quote/${q.id}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                View quote →
              </a>
              <a href={`/admin/quotes/${q.id}`} style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                Audit
              </a>
              {isNewest && !isSuperseded && !isAccepted && (
                <button
                  onClick={() => handleNewVersion(q.id)}
                  disabled={creatingFrom === q.id}
                  style={{
                    fontSize: 12, color: 'var(--text-secondary)', background: 'none',
                    border: '0.5px solid var(--border)', borderRadius: 4,
                    padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)',
                    marginLeft: 'auto',
                  }}
                >
                  {creatingFrom === q.id ? 'Creating…' : 'New version'}
                </button>
              )}
            </div>
          </div>
          </div>
        )
      })}

      <div style={{ marginTop: 4 }}>
        <a
          href={`/quote/new?event=${eventId}`}
          style={{
            fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none',
            border: '0.5px solid var(--border)', borderRadius: 4,
            padding: '5px 12px', display: 'inline-block',
          }}
        >
          + New quote from scratch
        </a>
      </div>
    </div>
  )
}
