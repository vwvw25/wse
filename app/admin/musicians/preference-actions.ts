'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'

export async function setPreferenceOrder(instrument: string, musicianIds: string[]) {
  const supabase = createServiceClient()
  // Delete existing order for this instrument
  await supabase.from('preference_orders').delete().eq('instrument', instrument)
  // Insert new ranked order
  if (musicianIds.length > 0) {
    await supabase.from('preference_orders').insert(
      musicianIds.map((musician_id, i) => ({ instrument, musician_id, rank: i + 1 })),
    )
  }
  revalidatePath('/admin/musicians')
}

export async function addToPreferenceOrder(instrument: string, musicianId: string) {
  const supabase = createServiceClient()
  const { data: existing } = await supabase
    .from('preference_orders')
    .select('rank')
    .eq('instrument', instrument)
    .order('rank', { ascending: false })
    .limit(1)
  const nextRank = (existing?.[0]?.rank ?? 0) + 1
  await supabase.from('preference_orders').insert({ instrument, musician_id: musicianId, rank: nextRank })
  revalidatePath('/admin/musicians')
}

export async function removeFromPreferenceOrder(id: string) {
  const supabase = createServiceClient()
  await supabase.from('preference_orders').delete().eq('id', id)
  revalidatePath('/admin/musicians')
}

export async function reorderPreference(instrument: string, musicianIds: string[]) {
  const supabase = createServiceClient()
  await supabase.from('preference_orders').delete().eq('instrument', instrument)
  if (musicianIds.length > 0) {
    await supabase.from('preference_orders').insert(
      musicianIds.map((musician_id, i) => ({ instrument, musician_id, rank: i + 1 })),
    )
  }
  revalidatePath('/admin/musicians')
}
