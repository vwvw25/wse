'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type { EventStatus } from '@/lib/event-statuses'

export async function updateEventStatus(eventId: string, status: EventStatus) {
  const supabase = createServiceClient()
  await supabase.from('events').update({ status }).eq('id', eventId)
  revalidatePath(`/admin/events/${eventId}`)
  revalidatePath('/admin/events')
  revalidatePath('/admin/bookings')
}
