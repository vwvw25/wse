'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import type { Musician, BandTemplate, BandTemplateSlot } from '@/types/musicians'

// ── Musicians ─────────────────────────────────────────────────────────────────

export async function upsertMusician(
  data: Omit<Musician, 'id' | 'created_at'> & { id?: string },
) {
  const supabase = createServiceClient()
  const { id, ...fields } = data
  if (id) {
    await supabase.from('musicians').update(fields).eq('id', id)
  } else {
    await supabase.from('musicians').insert(fields)
  }
  revalidatePath('/admin/musicians')
}

export async function deleteMusician(id: string) {
  const supabase = createServiceClient()
  await supabase.from('musicians').delete().eq('id', id)
  revalidatePath('/admin/musicians')
}

// ── Band templates ────────────────────────────────────────────────────────────

export async function createBandTemplate(name: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('band_templates')
    .insert({ name: name.trim() })
    .select('id')
    .single()
  revalidatePath('/admin/musicians')
  return data?.id ?? null
}

export async function renameBandTemplate(id: string, name: string) {
  const supabase = createServiceClient()
  await supabase.from('band_templates').update({ name: name.trim() }).eq('id', id)
  revalidatePath('/admin/musicians')
}

export async function deleteBandTemplate(id: string) {
  const supabase = createServiceClient()
  await supabase.from('band_templates').delete().eq('id', id)
  revalidatePath('/admin/musicians')
}

// ── Template slots ────────────────────────────────────────────────────────────

export async function addTemplateSlot(templateId: string, instrument: string) {
  const supabase = createServiceClient()
  const { data: max } = await supabase
    .from('band_template_slots')
    .select('sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = (max?.[0]?.sort_order ?? -1) + 1
  await supabase.from('band_template_slots').insert({
    template_id: templateId,
    instrument: instrument.trim(),
    sort_order: nextOrder,
  })
  revalidatePath('/admin/musicians')
}

export async function deleteTemplateSlot(id: string) {
  const supabase = createServiceClient()
  await supabase.from('band_template_slots').delete().eq('id', id)
  revalidatePath('/admin/musicians')
}

export async function reorderTemplateSlots(
  slots: Pick<BandTemplateSlot, 'id' | 'sort_order'>[],
) {
  const supabase = createServiceClient()
  await Promise.all(
    slots.map(s => supabase.from('band_template_slots').update({ sort_order: s.sort_order }).eq('id', s.id)),
  )
  revalidatePath('/admin/musicians')
}
