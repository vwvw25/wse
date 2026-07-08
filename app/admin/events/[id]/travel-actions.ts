'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import type { TravelExpense } from '@/types/travel'

function revalidate(eventId: string) {
  revalidatePath(`/admin/events/${eventId}`)
}

export async function updateTravelDetails(
  eventId: string,
  data: {
    travel_method: string | null
    congestion_charge_required: string | null
    parking_type: string | null
  }
) {
  const supabase = createServiceClient()
  await supabase.from('events').update(data).eq('id', eventId)
  revalidate(eventId)
}

export async function updateRoundTripMiles(eventId: string, miles: number | null) {
  const supabase = createServiceClient()
  await supabase.from('events').update({ round_trip_miles: miles }).eq('id', eventId)
  revalidate(eventId)
}

export async function upsertTravelExpense(
  eventId: string,
  item: Partial<TravelExpense> & { event_id: string },
) {
  const supabase = createServiceClient()
  if (item.id) {
    await supabase.from('event_travel_expenses').update({
      description: item.description,
      amount: item.amount,
    }).eq('id', item.id)
  } else {
    const { data: existing } = await supabase
      .from('event_travel_expenses')
      .select('sort_order')
      .eq('event_id', item.event_id)
      .order('sort_order', { ascending: false })
      .limit(1)
    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1
    await supabase.from('event_travel_expenses').insert({
      event_id: item.event_id,
      description: item.description ?? '',
      amount: item.amount ?? 0,
      sort_order: nextOrder,
    })
  }
  revalidate(eventId)
}

export async function deleteTravelExpense(itemId: string, eventId: string) {
  const supabase = createServiceClient()
  await supabase.from('event_travel_expenses').delete().eq('id', itemId)
  revalidate(eventId)
}
