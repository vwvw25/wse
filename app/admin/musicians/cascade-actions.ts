'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'

// ── Templates ─────────────────────────────────────────────────────────────────

export async function createCascadeTemplate(name: string, instrument: string) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('cascade_templates')
    .insert({ name, instrument })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/musicians')
}

export async function renameCascadeTemplate(id: string, name: string) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('cascade_templates')
    .update({ name })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/musicians')
}

export async function deleteCascadeTemplate(id: string) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('cascade_templates')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/musicians')
}

// ── Template musicians ────────────────────────────────────────────────────────

export async function addMusicianToCascadeTemplate(templateId: string, musicianId: string) {
  const supabase = createServiceClient()
  // Find current max rank
  const { data: existing } = await supabase
    .from('cascade_template_musicians')
    .select('rank')
    .eq('template_id', templateId)
    .order('rank', { ascending: false })
    .limit(1)
  const nextRank = (existing?.[0]?.rank ?? 0) + 1
  const { error } = await supabase
    .from('cascade_template_musicians')
    .insert({ template_id: templateId, musician_id: musicianId, rank: nextRank })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/musicians')
}

export async function removeMusicianFromCascadeTemplate(entryId: string) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('cascade_template_musicians')
    .delete()
    .eq('id', entryId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/musicians')
}

export async function reorderCascadeTemplate(templateId: string, musicianIds: string[]) {
  const supabase = createServiceClient()
  // Delete and re-insert in new order
  await supabase
    .from('cascade_template_musicians')
    .delete()
    .eq('template_id', templateId)
  if (musicianIds.length > 0) {
    const { error } = await supabase
      .from('cascade_template_musicians')
      .insert(musicianIds.map((musician_id, i) => ({
        template_id: templateId,
        musician_id,
        rank: i + 1,
      })))
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/musicians')
}
