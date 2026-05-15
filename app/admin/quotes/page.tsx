import React from 'react'
import { createServiceClient } from '@/lib/supabase'
import QuoteRequestsTable from './QuoteRequestsTable'

export const dynamic = 'force-dynamic'

export default async function AdminQuotesPage() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('quote_requests')
    .select('*, event:events(id, agency_name, agent_name, event_date, venue_name), quotes(id, status)')
    .order('created_at', { ascending: false })

  if (error) return <div style={{ padding: 32, color: 'red' }}>Failed to load: {error.message}</div>

  const rows = (data ?? []) as QuoteRequest[]

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Quotes</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {rows.length} quote request{rows.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
      <QuoteRequestsTable rows={rows} />
    </div>
  )
}

export type QuoteRequest = {
  id: string
  event_id: string | null
  auto_fill: Record<string, unknown>
  request_details: Record<string, unknown> | null
  created_at: string
  event: { id: string; agency_name: string | null; agent_name: string | null; event_date: string | null; venue_name: string | null } | null
  quotes: { id: string; status: string | null }[]
}
