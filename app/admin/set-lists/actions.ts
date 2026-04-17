'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import type { Song } from '@/types/set-list'

// ── Tag options ───────────────────────────────────────────────────────────────

export async function addTagOption(category: string, value: string) {
  const supabase = createServiceClient()
  const { data: max } = await supabase
    .from('tag_options')
    .select('sort_order')
    .eq('category', category)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = (max?.[0]?.sort_order ?? -1) + 1
  await supabase.from('tag_options').insert({ category, value: value.trim(), sort_order: nextOrder })
  revalidatePath('/admin/set-lists')
}

export async function deleteTagOption(id: string) {
  const supabase = createServiceClient()
  await supabase.from('tag_options').delete().eq('id', id)
  revalidatePath('/admin/set-lists')
}

export async function updateSetList(id: string, data: { name: string; event_id: string | null; is_template: boolean }) {
  const supabase = createServiceClient()
  await supabase.from('set_lists').update(data).eq('id', id)
  revalidatePath('/admin/set-lists')
  revalidatePath(`/admin/set-lists/${id}`)
}

// ── Songs ────────────────────────────────────────────────────────────────────

export async function upsertSong(data: Omit<Song, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
  const supabase = createServiceClient()
  const { id, ...fields } = data
  if (id) {
    await supabase.from('songs').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
  } else {
    await supabase.from('songs').insert(fields)
  }
  revalidatePath('/admin/set-lists')
}

export async function bulkInsertSongs(songs: { title: string; artist?: string | null; key?: string | null; link?: string | null; tags?: string | null; notes?: string | null }[]) {
  const supabase = createServiceClient()
  await supabase.from('songs').insert(songs)
  revalidatePath('/admin/set-lists')
}

export async function deleteSong(id: string) {
  const supabase = createServiceClient()
  await supabase.from('songs').delete().eq('id', id)
  revalidatePath('/admin/set-lists')
}

// ── Set lists ─────────────────────────────────────────────────────────────────

export async function createSetList(data: { name: string; event_id: string | null; is_template: boolean }) {
  const supabase = createServiceClient()
  const { data: row } = await supabase.from('set_lists').insert(data).select('id').single()
  revalidatePath('/admin/set-lists')
  return row?.id as string | undefined
}

export async function deleteSetList(id: string) {
  const supabase = createServiceClient()
  await supabase.from('set_lists').delete().eq('id', id)
  revalidatePath('/admin/set-lists')
}

export async function renameSetList(id: string, name: string) {
  const supabase = createServiceClient()
  await supabase.from('set_lists').update({ name }).eq('id', id)
  revalidatePath('/admin/set-lists')
  revalidatePath(`/admin/set-lists/${id}`)
}

// ── Set list songs ────────────────────────────────────────────────────────────

export async function addSongToSetList(setListId: string, songId: string, setNumber?: number) {
  const supabase = createServiceClient()
  // get current max position
  const { data: existing } = await supabase
    .from('set_list_songs')
    .select('position')
    .eq('set_list_id', setListId)
    .order('position', { ascending: false })
    .limit(1)
  const nextPos = existing?.[0]?.position != null ? existing[0].position + 1 : 0
  await supabase.from('set_list_songs').insert({
    set_list_id: setListId,
    song_id: songId,
    position: nextPos,
    set_number: setNumber ?? null,
  })
  revalidatePath(`/admin/set-lists/${setListId}`)
}

export async function removeSongFromSetList(setListSongId: string, setListId: string) {
  const supabase = createServiceClient()
  await supabase.from('set_list_songs').delete().eq('id', setListSongId)
  revalidatePath(`/admin/set-lists/${setListId}`)
}

export async function reorderSetListSongs(
  setListId: string,
  updates: { id: string; position: number; set_number: number | null }[],
) {
  const supabase = createServiceClient()
  await Promise.all(
    updates.map(u =>
      supabase.from('set_list_songs').update({ position: u.position, set_number: u.set_number }).eq('id', u.id),
    ),
  )
  revalidatePath(`/admin/set-lists/${setListId}`)
}

export async function applyTemplate(templateId: string, targetSetListId: string) {
  const supabase = createServiceClient()
  const { data: songs } = await supabase
    .from('set_list_songs')
    .select('song_id, position, set_number')
    .eq('set_list_id', templateId)
    .order('position')
  if (!songs?.length) return
  await supabase.from('set_list_songs').insert(
    songs.map(s => ({ set_list_id: targetSetListId, song_id: s.song_id, position: s.position, set_number: s.set_number })),
  )
  revalidatePath(`/admin/set-lists/${targetSetListId}`)
}
