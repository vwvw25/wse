import React from 'react'
import { createServiceClient } from '@/lib/supabase'
import type { QuoteRecord } from '@/types/quote'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return '£' + Math.round(n).toLocaleString('en-GB')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminDashboardPage() {
  const supabase = createServiceClient()
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return <div style={{ padding: 32, color: 'red' }}>Failed to load: {error.message}</div>

  const rows = (quotes ?? []) as QuoteRecord[]

  // Stats
  const now = new Date()
  const thisMonth = rows.filter(q => {
    const d = new Date(q.created_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  // Most common band size
  const bandSizeCounts: Record<string, number> = {}
  for (const q of rows) {
    const sizes = q.inputs.band_sizes?.length ? q.inputs.band_sizes : (q.inputs.band_size ? [q.inputs.band_size] : [])
    for (const s of sizes) {
      bandSizeCounts[s] = (bandSizeCounts[s] ?? 0) + 1
    }
  }
  const topBandSize = Object.entries(bandSizeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  // Avg price across all price_options of all quotes
  let priceSum = 0
  let priceCount = 0
  for (const q of rows) {
    for (const opt of q.calculated.price_options ?? []) {
      priceSum += opt.total_price
      priceCount++
    }
  }
  const avgPrice = priceCount > 0 ? priceSum / priceCount : null

  const recent = rows.slice(0, 10)

  const statCard: React.CSSProperties = {
    background: 'var(--bg)',
    border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px 24px',
  }

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 36 }}>
        <div style={statCard}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Total quotes</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)' }}>{rows.length}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>This month</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)' }}>{thisMonth.length}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Most common band</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{topBandSize.replace(/_/g, ' ')}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Avg quote price</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)' }}>{avgPrice != null ? fmt(avgPrice) : '—'}</div>
        </div>
      </div>

      {/* Recent quotes */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--text)' }}>Recent quotes</h2>
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={th}>Created</th>
                <th style={th}>Client / agency</th>
                <th style={th}>Band</th>
                <th style={th}>Price range</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {recent.map(q => {
                const inp = q.inputs
                const calc = q.calculated
                const prices = (calc.price_options ?? []).map(o => o.total_price)
                const minP = prices.length ? Math.min(...prices) : null
                const maxP = prices.length ? Math.max(...prices) : null
                const priceStr = minP == null || maxP == null ? '—'
                  : minP === maxP ? fmt(minP)
                  : `${fmt(minP)} – ${fmt(maxP)}`
                const bandSizes = inp.band_sizes?.length ? inp.band_sizes : (inp.band_size ? [inp.band_size] : [])
                const client = [inp.agency_name, inp.agent_name].filter(Boolean).join(' / ') || '—'
                return (
                  <tr key={q.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={td}>{fmtDate(q.created_at)}</td>
                    <td style={td}>{client}</td>
                    <td style={{ ...td, fontSize: 12 }}>{bandSizes.map(s => s.replace(/_/g, ' ')).join(', ') || '—'}</td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{priceStr}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <a href={`/admin/quotes/${q.id}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Audit →</a>
                      {' '}
                      <a href={`/quote/${q.id}`} style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', marginLeft: 8 }}>Quote ↗</a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {recent.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 24, textAlign: 'center' }}>No quotes yet.</p>
          )}
        </div>
        {rows.length > 10 && (
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <a href="/admin/quotes" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
              View all {rows.length} quotes →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 500, fontSize: 12 }
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'top' }
