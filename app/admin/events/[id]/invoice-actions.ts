'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import type { InvoiceLineItem, ClientType } from '@/types/invoice'

function revalidate(eventId: string) {
  revalidatePath(`/admin/events/${eventId}`)
}

// Generate next invoice number for the year
async function nextInvoiceNumber(supabase: ReturnType<typeof createServiceClient>): Promise<{ number: string; year: number; sequence: number }> {
  const year = new Date().getFullYear()

  // Get current counter for this year
  const { data: settings } = await supabase.from('invoice_settings').select('id, year_counters').single()
  const counters: Record<string, number> = settings?.year_counters ?? {}
  const current = counters[String(year)] ?? 66 // default starts at 66 so first invoice is 067
  const next = current + 1

  // Update counter
  await supabase
    .from('invoice_settings')
    .update({ year_counters: { ...counters, [String(year)]: next } })
    .eq('id', settings!.id)

  const sequence = next
  const number = `WSE-${year}-${String(sequence).padStart(3, '0')}`
  return { number, year, sequence }
}

export async function createInvoice(
  eventId: string,
  prefillLineItems: { description: string; cost: number }[],
) {
  const supabase = createServiceClient()
  const { number, year, sequence } = await nextInvoiceNumber(supabase)

  const { data: invoice } = await supabase
    .from('invoices')
    .insert({
      event_id: eventId,
      number,
      year,
      sequence,
      status: 'unsent',
      issue_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (invoice && prefillLineItems.length > 0) {
    await supabase.from('invoice_line_items').insert(
      prefillLineItems.map((item, i) => ({
        invoice_id: invoice.id,
        description: item.description,
        cost: item.cost,
        vat_rate: 0,
        sort_order: i,
      }))
    )
  }

  revalidate(eventId)
  return invoice
}

export async function updateInvoice(
  invoiceId: string,
  eventId: string,
  data: {
    status?: string
    issue_date?: string | null
    due_date?: string | null
    notes?: string | null
    po_number?: string | null
    sent_at?: string | null
    auto_send_at?: string | null
    auto_send_day_of_event?: boolean
  },
) {
  const supabase = createServiceClient()
  await supabase.from('invoices').update(data).eq('id', invoiceId)
  revalidate(eventId)
}

export async function deleteInvoice(invoiceId: string, eventId: string) {
  const supabase = createServiceClient()
  await supabase.from('invoices').delete().eq('id', invoiceId)
  revalidate(eventId)
}

export async function upsertLineItem(
  eventId: string,
  item: Partial<InvoiceLineItem> & { invoice_id: string },
) {
  const supabase = createServiceClient()
  if (item.id) {
    await supabase.from('invoice_line_items').update({
      description: item.description,
      cost: item.cost,
      vat_rate: item.vat_rate,
    }).eq('id', item.id)
  } else {
    const { data: existing } = await supabase
      .from('invoice_line_items')
      .select('sort_order')
      .eq('invoice_id', item.invoice_id)
      .order('sort_order', { ascending: false })
      .limit(1)
    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1
    await supabase.from('invoice_line_items').insert({
      invoice_id: item.invoice_id,
      description: item.description ?? '',
      cost: item.cost ?? 0,
      vat_rate: item.vat_rate ?? 0,
      sort_order: nextOrder,
    })
  }
  revalidate(eventId)
}

export async function deleteLineItem(itemId: string, eventId: string) {
  const supabase = createServiceClient()
  await supabase.from('invoice_line_items').delete().eq('id', itemId)
  revalidate(eventId)
}

export async function markInvoiceSent(invoiceId: string, eventId: string) {
  const supabase = createServiceClient()
  const now = new Date().toISOString()
  await supabase.from('invoices').update({ sent_at: now, status: 'sent' }).eq('id', invoiceId).eq('status', 'unsent')
  await supabase.from('invoices').update({ sent_at: now }).eq('id', invoiceId).neq('status', 'unsent')
  revalidate(eventId)
}

// ── Client linking ────────────────────────────────────────────────────────────

export async function createAndLinkClient(
  eventId: string,
  data: {
    name: string
    client_type: ClientType
    email: string | null
    phone: string | null
    address: string | null
    notes: string | null
  }
) {
  const supabase = createServiceClient()
  const { data: client } = await supabase
    .from('clients')
    .insert(data)
    .select()
    .single()
  if (client) {
    await supabase.from('events').update({ client_id: client.id }).eq('id', eventId)
  }
  revalidate(eventId)
  return client
}

export async function linkExistingClient(eventId: string, clientId: string) {
  const supabase = createServiceClient()
  await supabase.from('events').update({ client_id: clientId }).eq('id', eventId)
  revalidate(eventId)
}

export async function unlinkClient(eventId: string) {
  const supabase = createServiceClient()
  await supabase.from('events').update({ client_id: null }).eq('id', eventId)
  revalidate(eventId)
}

export async function updateLinkedClient(
  eventId: string,
  clientId: string,
  data: {
    name: string
    client_type: ClientType
    email: string | null
    phone: string | null
    address: string | null
    notes: string | null
  }
) {
  const supabase = createServiceClient()
  await supabase.from('clients').update(data).eq('id', clientId)
  revalidate(eventId)
}
