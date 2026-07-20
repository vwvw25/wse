import type { SupabaseClient } from '@supabase/supabase-js'

// Past, confirmed_stc/contracted gigs — the scope for the "Total outstanding"
// and "Uninvoiced" dashboard cards shown on both the Invoices and Events pages.
export const SCOPED_EVENT_STATUSES = ['confirmed_stc', 'contracted']

type ScopedEventLineItem = { cost: number; vat_rate: number }

export type RawScopedEvent = {
  id: string
  agency_name: string | null
  agent_name: string | null
  event_date: string | null
  status: string
  booked_fee: number | null
  client: { name: string; email: string | null } | null
  invoices: { status: string; line_items: ScopedEventLineItem[] | null }[] | null
}

// `amount` is what's still owed (invoiced-but-unpaid total, or the booked fee if
// nothing's been invoiced yet); `isUninvoiced` is true when no invoice exists yet
// or every invoice on the event is still an unsent draft.
export type ScopedEvent = {
  id: string
  agency_name: string | null
  agent_name: string | null
  event_date: string | null
  status: string
  client: { name: string; email: string | null } | null
  amount: number
  isUninvoiced: boolean
}

export function lineItemsTotal(items: ScopedEventLineItem[]): number {
  return items.reduce((sum, i) => sum + i.cost * (1 + i.vat_rate / 100), 0)
}

export function toScopedEvents(raw: RawScopedEvent[]): ScopedEvent[] {
  return raw.map(e => {
    const eventInvoices = e.invoices ?? []
    const hasInvoice = eventInvoices.length > 0
    const isUninvoiced = eventInvoices.every(inv => inv.status === 'unsent')
    const amount = hasInvoice
      ? eventInvoices
          .filter(inv => inv.status !== 'paid')
          .reduce((sum, inv) => sum + lineItemsTotal(inv.line_items ?? []), 0)
      : (e.booked_fee ?? 0)

    return {
      id: e.id,
      agency_name: e.agency_name,
      agent_name: e.agent_name,
      event_date: e.event_date,
      status: e.status,
      client: e.client,
      amount,
      isUninvoiced,
    }
  })
}

export async function fetchScopedEvents(supabase: SupabaseClient): Promise<ScopedEvent[]> {
  const todayStr = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('events')
    .select('id, agency_name, agent_name, event_date, status, booked_fee, client:clients(name, email), invoices(status, line_items:invoice_line_items(cost, vat_rate))')
    .in('status', SCOPED_EVENT_STATUSES)
    .not('event_date', 'is', null)
    .lt('event_date', todayStr)

  return toScopedEvents((data ?? []) as unknown as RawScopedEvent[])
}

// Total + count for all not-yet-paid invoices, regardless of event date/status —
// the scope for the "Unpaid invoices" card.
export async function fetchUnpaidInvoicesSummary(supabase: SupabaseClient): Promise<{ total: number; count: number }> {
  const { data } = await supabase
    .from('invoices')
    .select('status, line_items:invoice_line_items(cost, vat_rate)')
    .not('status', 'in', '(paid,paid_incorrect_amount)')

  const rows = (data ?? []) as { line_items: ScopedEventLineItem[] | null }[]
  return {
    total: rows.reduce((sum, r) => sum + lineItemsTotal(r.line_items ?? []), 0),
    count: rows.length,
  }
}
