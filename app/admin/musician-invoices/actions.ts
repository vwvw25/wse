'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { logEventActivity } from '@/lib/event-activity'

type ServiceClient = ReturnType<typeof createServiceClient>

const STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  queried: 'Queried',
  paid: 'Paid',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function getSlotContext(supabase: ServiceClient, slotId: string) {
  const { data } = await supabase
    .from('event_musicians')
    .select('event_id, instrument, musician:musicians(first_name, last_name)')
    .eq('id', slotId)
    .single()
  if (!data) return null
  const musician = data.musician as unknown as { first_name: string; last_name: string } | null
  const label = musician ? `${musician.first_name} ${musician.last_name} (${data.instrument})` : data.instrument
  return { eventId: data.event_id as string, label }
}

export async function updateMusicianInvoiceStatus(slotId: string, status: string | null) {
  const supabase = createServiceClient()
  const ctx = await getSlotContext(supabase, slotId)
  await supabase
    .from('event_musicians')
    .update({ musician_invoice_status: status || null })
    .eq('id', slotId)
  revalidatePath('/admin/musician-invoices')
  if (ctx) {
    revalidatePath(`/admin/events/${ctx.eventId}`)
    await logEventActivity(ctx.eventId, {
      type: 'invoice_change',
      summary: `Musician invoice status for ${ctx.label} set to ${status ? (STATUS_LABELS[status] ?? status) : 'Awaiting'}`,
    })
  }
}

export async function updateMusicianPaymentDate(slotId: string, date: string | null) {
  const supabase = createServiceClient()
  const ctx = await getSlotContext(supabase, slotId)
  await supabase
    .from('event_musicians')
    .update({ musician_payment_date: date || null })
    .eq('id', slotId)
  revalidatePath('/admin/musician-invoices')
  if (ctx) {
    revalidatePath(`/admin/events/${ctx.eventId}`)
    await logEventActivity(ctx.eventId, {
      type: 'invoice_change',
      summary: date
        ? `Payment date for ${ctx.label} set to ${formatDate(date)}`
        : `Payment date for ${ctx.label} cleared`,
    })
  }
}

export async function updateMusicianInvoiceDueDate(slotId: string, date: string | null) {
  const supabase = createServiceClient()
  const ctx = await getSlotContext(supabase, slotId)
  await supabase
    .from('event_musicians')
    .update({ musician_invoice_due_date: date || null })
    .eq('id', slotId)
  revalidatePath('/admin/musician-invoices')
  if (ctx) {
    revalidatePath(`/admin/events/${ctx.eventId}`)
    await logEventActivity(ctx.eventId, {
      type: 'invoice_change',
      summary: date
        ? `Invoice due date for ${ctx.label} set to ${formatDate(date)}`
        : `Invoice due date for ${ctx.label} cleared`,
    })
  }
}

export async function removeMusicianInvoice(slotId: string, storagePath: string) {
  const supabase = createServiceClient()
  const ctx = await getSlotContext(supabase, slotId)
  await supabase.storage.from('musician-invoices').remove([storagePath]).catch(() => {})
  await supabase
    .from('event_musicians')
    .update({ musician_invoice_path: null, musician_invoice_filename: null })
    .eq('id', slotId)
  revalidatePath('/admin/musician-invoices')
  if (ctx) {
    revalidatePath(`/admin/events/${ctx.eventId}`)
    await logEventActivity(ctx.eventId, {
      type: 'invoice_change',
      summary: `Musician invoice file removed for ${ctx.label}`,
    })
  }
}
