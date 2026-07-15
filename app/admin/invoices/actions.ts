'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

function revalidate(eventId?: string | null) {
  revalidatePath('/admin/invoices')
  if (eventId) revalidatePath(`/admin/events/${eventId}`)
}

export async function updateInvoiceStatus(invoiceId: string, status: string, eventId?: string | null) {
  const supabase = createServiceClient()
  await supabase.from('invoices').update({ status }).eq('id', invoiceId)
  revalidate(eventId)
}

export async function updateInvoicePaidDate(invoiceId: string, date: string | null, eventId?: string | null) {
  const supabase = createServiceClient()
  const update: { paid_date: string | null; status?: string } = { paid_date: date || null }
  if (date) update.status = 'paid'
  await supabase.from('invoices').update(update).eq('id', invoiceId)
  revalidate(eventId)
}

export async function updateInvoiceAmountReceived(invoiceId: string, amount: number | null, eventId?: string | null) {
  const supabase = createServiceClient()
  await supabase.from('invoices').update({ amount_received: amount }).eq('id', invoiceId)
  revalidate(eventId)
}

export async function updateInvoiceNotes(invoiceId: string, notes: string | null, eventId?: string | null) {
  const supabase = createServiceClient()
  await supabase.from('invoices').update({ notes: notes || null }).eq('id', invoiceId)
  revalidate(eventId)
}
