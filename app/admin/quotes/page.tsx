import React from 'react'
import { createServiceClient } from '@/lib/supabase'
import QuotesTable from './QuotesTable'
import type { QuoteRecord } from '@/types/quote'

export const dynamic = 'force-dynamic'

export default async function AdminQuotesPage() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('quotes')
    .select('*, event:events(id, agency_name, agent_name, event_date, venue_name)')
    .order('created_at', { ascending: false })

  if (error) return <div style={{ padding: 32, color: 'red' }}>Failed to load: {error.message}</div>

  const rows = (data ?? []) as QuoteRecord[]

  return (
    <div className="admin-page" style={{ fontFamily: 'var(--font)' }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Quotes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {rows.length} quote{rows.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="page-header-actions">
          <a href="/admin/email-to-quote" style={{
            display: 'inline-block', padding: '8px 16px', fontSize: 13, fontWeight: 500,
            background: 'var(--bg-secondary)', color: 'var(--text)', borderRadius: 'var(--radius-sm)',
            textDecoration: 'none', border: '0.5px solid var(--border)',
          }}>
            New from email
          </a>
          <a href="/quote/new" style={{
            display: 'inline-block', padding: '8px 16px', fontSize: 13, fontWeight: 500,
            background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
          }}>
            New quote
          </a>
        </div>
      </div>
      <div className="admin-table-wrap"><QuotesTable quotes={rows} /></div>
    </div>
  )
}
