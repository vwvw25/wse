'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'

// Add one or more from-repertoire requests (already matched to song_id)
export async function addFromRepertoireRequests(
  eventId: string,
  songs: { song_id: string; title: string; artist: string | null }[],
) {
  const supabase = createServiceClient()
  await supabase.from('event_requests').insert(
    songs.map(s => ({
      event_id: eventId,
      type: 'from_repertoire',
      song_id: s.song_id,
      title: s.title,
      artist: s.artist,
      status: 'requested',
    })),
  )
  revalidatePath(`/admin/events/${eventId}`)
}

// Add a song to the repertoire and simultaneously register it as a to-learn request
export async function addSongAndToLearnRequest(
  eventId: string,
  song: { title: string; artist: string | null; key: string | null; link: string | null; notes: string | null },
) {
  const supabase = createServiceClient()
  const { data: newSong } = await supabase
    .from('songs')
    .insert({
      title: song.title.trim(),
      artist: song.artist?.trim() || null,
      key: song.key?.trim() || null,
      link: song.link?.trim() || null,
      notes: song.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (newSong?.id) {
    await supabase.from('event_requests').insert({
      event_id: eventId,
      type: 'to_learn',
      song_id: newSong.id,
      title: song.title.trim(),
      artist: song.artist?.trim() || null,
      status: 'requested',
    })
  }
  revalidatePath(`/admin/events/${eventId}`)
}

// Update request status
export async function updateRequestStatus(
  requestId: string,
  eventId: string,
  status: 'requested' | 'confirmed' | 'declined',
) {
  const supabase = createServiceClient()
  await supabase.from('event_requests').update({ status }).eq('id', requestId)
  revalidatePath(`/admin/events/${eventId}`)
}

export async function deleteRequest(requestId: string, eventId: string) {
  const supabase = createServiceClient()
  await supabase.from('event_requests').delete().eq('id', requestId)
  revalidatePath(`/admin/events/${eventId}`)
}
