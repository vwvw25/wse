import { createServiceClient } from '@/lib/supabase'
import InvoicesClient from './InvoicesClient'
import type { InvoiceRow, UninvoicedEvent } from './InvoicesClient'

export default async function InvoicesPage() {
  const supabase = createServiceClient()

  const [{ data: invoiceData }, { data: contractedData }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, line_items:invoice_line_items(*), event:events(id, agency_name, agent_name, event_date, client:clients(name, email))')
      .order('created_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, agency_name, agent_name, event_date, status, booked_fee, client:clients(name, email), invoices(id)')
      .in('status', ['confirmed_stc', 'contracted']),
  ])

  const invoices = (invoiceData ?? []) as InvoiceRow[]

  const invoicedEventIds = new Set(invoices.map(i => i.event?.id).filter(Boolean))
  const uninvoicedEvents = ((contractedData ?? []) as unknown as UninvoicedEvent[])
    .filter(e => !invoicedEventIds.has(e.id))

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Invoices</h1>
      </div>
      <InvoicesClient invoices={invoices} uninvoicedEvents={uninvoicedEvents} />
    </div>
  )
}
