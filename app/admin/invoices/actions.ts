'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { logEventActivity } from '@/lib/event-activity'

type ServiceClient = ReturnType<typeof createServiceClient>

const STATUS_LABELS: Record<string, string> = {
  unsent: 'Unsent',
  sent: 'Sent',
  chased: 'Chased',
  paid: 'Paid',
  paid_incorrect_amount: 'Paid – incorrect amount',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function getInvoiceContext(supabase: ServiceClient, invoiceId: string) {
  const { data } = await supabase.from('invoices').select('number, event_id').eq('id', invoiceId).single()
  return data
}

function revalidate(eventId?: string | null) {
  revalidatePath('/admin/invoices')
  if (eventId) revalidatePath(`/admin/events/${eventId}`)
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const supabase = createServiceClient()
  const invoice = await getInvoiceContext(supabase, invoiceId)
  await supabase.from('invoices').update({ status }).eq('id', invoiceId)
  revalidate(invoice?.event_id)
  if (invoice?.event_id) {
    await logEventActivity(invoice.event_id, {
      type: 'invoice_change',
      summary: `Invoice ${invoice.number} status set to ${STATUS_LABELS[status] ?? status}`,
    })
  }
}

export async function updateInvoicePaidDate(invoiceId: string, date: string | null) {
  const supabase = createServiceClient()
  const invoice = await getInvoiceContext(supabase, invoiceId)
  const update: { paid_date: string | null; status?: string } = { paid_date: date || null }
  if (date) update.status = 'paid'
  await supabase.from('invoices').update(update).eq('id', invoiceId)
  revalidate(invoice?.event_id)
  if (invoice?.event_id) {
    await logEventActivity(invoice.event_id, {
      type: 'invoice_change',
      summary: date
        ? `Invoice ${invoice.number} marked paid on ${formatDate(date)}`
        : `Invoice ${invoice.number} paid date cleared`,
    })
  }
}

export async function updateInvoiceAmountReceived(invoiceId: string, amount: number | null) {
  const supabase = createServiceClient()
  const invoice = await getInvoiceContext(supabase, invoiceId)
  await supabase.from('invoices').update({ amount_received: amount }).eq('id', invoiceId)
  revalidate(invoice?.event_id)
  if (invoice?.event_id) {
    await logEventActivity(invoice.event_id, {
      type: 'invoice_change',
      summary: amount != null
        ? `Invoice ${invoice.number} amount received set to £${amount.toFixed(2)}`
        : `Invoice ${invoice.number} amount received cleared`,
    })
  }
}

export async function updateInvoiceNotes(invoiceId: string, notes: string | null) {
  const supabase = createServiceClient()
  const invoice = await getInvoiceContext(supabase, invoiceId)
  await supabase.from('invoices').update({ notes: notes || null }).eq('id', invoiceId)
  revalidate(invoice?.event_id)
  if (invoice?.event_id) {
    await logEventActivity(invoice.event_id, {
      type: 'invoice_change',
      summary: `Invoice ${invoice.number} notes updated`,
    })
  }
}
