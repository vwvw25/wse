import { createServiceClient } from '@/lib/supabase'
import { fetchScopedEvents } from '@/lib/invoice-scope'
import InvoicesClient from './InvoicesClient'
import type { InvoiceRow } from './InvoicesClient'

export default async function InvoicesPage() {
  const supabase = createServiceClient()

  const [{ data: invoiceData }, scopedEvents] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, line_items:invoice_line_items(*), event:events(id, agency_name, agent_name, event_date, client:clients(name, email))')
      .order('created_at', { ascending: false }),
    fetchScopedEvents(supabase),
  ])

  const invoices = (invoiceData ?? []) as InvoiceRow[]

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Invoices</h1>
      </div>
      <InvoicesClient invoices={invoices} scopedEvents={scopedEvents} />
    </div>
  )
}
