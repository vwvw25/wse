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
  accepted:   { background: '#f0fdf4', color: '#16a34a', border: '0.5px solid #bbf7d0' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.sent
  return (
    <span style={{
      ...s, fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 4, textTransform: 'capitalize',
    }}>
      {status}
    </span>
  )
}

function fmt(n: number) { return '£' + Math.round(n).toLocaleString('en-GB') }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState('')
  const [accepting, setAccepting] = useState(false)

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

  async function handleAccept(quoteId: string) {
    if (!selectedOption) return
    setAccepting(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted_option: selectedOption }),
      })
      if (res.ok) {
        setQuotes(prev => prev.map(q =>
          q.id === quoteId ? { ...q, status: 'accepted', accepted_option: selectedOption } : q
        ))
        setAcceptingId(null)
        setSelectedOption('')
      }
    } finally {
      setAccepting(false)
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
        const prices = (q.calculated.price_options ?? []).map(o => o.total_price).filter(p => p != null)
        const minP = prices.length ? Math.min(...prices) : null
        const maxP = prices.length ? Math.max(...prices) : null
        const priceStr = minP == null || maxP == null ? '—' : minP === maxP ? fmt(minP) : `${fmt(minP)} – ${fmt(maxP)}`
        const isSuperseded = q.status === 'superseded'
        const isAccepted = q.status === 'accepted'
        const isNewest = i === 0

        return (
          <div
            key={q.id}
            style={{
              border: `0.5px solid ${isAccepted ? '#bbf7d0' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              marginBottom: 10,
              background: isAccepted ? '#f0fdf4' : isSuperseded ? 'var(--bg-secondary)' : 'var(--bg)',
              opacity: isSuperseded ? 0.6 : 1,
            }}
          >
            {/* Row 1: version + status + date + price */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                Version {q.version}
              </span>
              <StatusBadge status={q.status} />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                {fmtDate(q.created_at)}
              </span>
            </div>

            {/* Row 2: price + options count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {priceStr}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {(q.calculated.price_options ?? []).length} option{(q.calculated.price_options ?? []).length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Accepted option display */}
            {isAccepted && q.accepted_option && (
              <div style={{
                fontSize: 12, color: '#16a34a', fontWeight: 500,
                marginBottom: 10,
              }}>
                ✓ Accepted: {q.accepted_option}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <a
                href={`/quote/${q.id}`}
                style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
              >
                View quote →
              </a>
              <a
                href={`/admin/quotes/${q.id}`}
                style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}
              >
                Audit
              </a>

              {/* New version — only on the latest non-superseded quote */}
              {isNewest && !isSuperseded && (
                <button
                  onClick={() => handleNewVersion(q.id)}
                  disabled={creatingFrom === q.id}
                  style={{
                    fontSize: 12, color: 'var(--text-secondary)', background: 'none',
                    border: '0.5px solid var(--border)', borderRadius: 4,
                    padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)',
                  }}
                >
                  {creatingFrom === q.id ? 'Creating…' : 'New version'}
                </button>
              )}

              {/* Mark as accepted — only if not already accepted/superseded */}
              {!isAccepted && !isSuperseded && acceptingId !== q.id && (
                <button
                  onClick={() => { setAcceptingId(q.id); setSelectedOption('') }}
                  style={{
                    fontSize: 12, color: '#16a34a', background: 'none',
                    border: '0.5px solid #bbf7d0', borderRadius: 4,
                    padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)',
                  }}
                >
                  Mark as accepted
                </button>
              )}
            </div>

            {/* Accept form */}
            {acceptingId === q.id && (
              <div style={{
                marginTop: 12, padding: '12px 14px',
                background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                borderRadius: 6,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                  Which option did the client go for?
                </div>
                <select
                  value={selectedOption}
                  onChange={e => setSelectedOption(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px', fontSize: 13,
                    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)',
                    marginBottom: 10, outline: 'none',
                  }}
                >
                  <option value="">Select an option…</option>
                  {(q.calculated.price_options ?? []).map((opt, idx) => {
                    const label = [
                      opt.line_up || opt.band_size,
                      opt.set_config?.replace('x', '×'),
                      opt.total_price != null ? fmt(opt.total_price) : null,
                    ].filter(Boolean).join(' — ')
                    return <option key={idx} value={label}>{label}</option>
                  })}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleAccept(q.id)}
                    disabled={!selectedOption || accepting}
                    style={{
                      padding: '6px 16px', fontSize: 13, fontWeight: 500,
                      background: '#16a34a', color: '#fff', border: 'none',
                      borderRadius: 'var(--radius-sm)', cursor: !selectedOption || accepting ? 'not-allowed' : 'pointer',
                      opacity: !selectedOption || accepting ? 0.6 : 1, fontFamily: 'var(--font)',
                    }}
                  >
                    {accepting ? 'Saving…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => { setAcceptingId(null); setSelectedOption('') }}
                    style={{
                      padding: '6px 14px', fontSize: 13,
                      background: 'none', color: 'var(--text-secondary)',
                      border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', fontFamily: 'var(--font)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
