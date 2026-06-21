'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function updateMusicianInvoiceStatus(slotId: string, status: string | null) {
  const supabase = createServiceClient()
  await supabase
    .from('event_musicians')
    .update({ musician_invoice_status: status || null })
    .eq('id', slotId)
  revalidatePath('/admin/musician-invoices')
}

export async function updateMusicianPaymentDate(slotId: string, date: string | null) {
  const supabase = createServiceClient()
  await supabase
    .from('event_musicians')
    .update({ musician_payment_date: date || null })
    .eq('id', slotId)
  revalidatePath('/admin/musician-invoices')
}

export async function updateMusicianInvoiceDueDate(slotId: string, date: string | null) {
  const supabase = createServiceClient()
  await supabase
    .from('event_musicians')
    .update({ musician_invoice_due_date: date || null })
    .eq('id', slotId)
  revalidatePath('/admin/musician-invoices')
}

export async function removeMusicianInvoice(slotId: string, storagePath: string) {
  const supabase = createServiceClient()
  await supabase.storage.from('musician-invoices').remove([storagePath]).catch(() => {})
  await supabase
    .from('event_musicians')
    .update({ musician_invoice_path: null, musician_invoice_filename: null })
    .eq('id', slotId)
  revalidatePath('/admin/musician-invoices')
}
