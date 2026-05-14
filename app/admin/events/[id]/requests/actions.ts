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

// Add a to-learn request
export async function addToLearnRequest(
  eventId: string,
  title: string,
  artist: string | null,
) {
  const supabase = createServiceClient()
  await supabase.from('event_requests').insert({
    event_id: eventId,
    type: 'to_learn',
    song_id: null,
    title: title.trim(),
    artist: artist?.trim() || null,
    status: 'requested',
  })
  revalidatePath(`/admin/events/${eventId}`)
}

// Update request status. If confirming a to_learn request, stub the song into the repertoire.
export async function updateRequestStatus(
  requestId: string,
  eventId: string,
  status: 'requested' | 'confirmed' | 'declined',
  currentSongId: string | null,
  type: 'from_repertoire' | 'to_learn',
  title: string,
  artist: string | null,
) {
  const supabase = createServiceClient()

  let songId = currentSongId

  if (status === 'confirmed' && type === 'to_learn' && !currentSongId) {
    // Stub the song into the repertoire
    const { data: newSong } = await supabase
      .from('songs')
      .insert({ title: title.trim(), artist: artist?.trim() || null })
      .select('id')
      .single()
    songId = newSong?.id ?? null
  }

  await supabase
    .from('event_requests')
    .update({ status, song_id: songId })
    .eq('id', requestId)

  revalidatePath(`/admin/events/${eventId}`)
}

export async function deleteRequest(requestId: string, eventId: string) {
  const supabase = createServiceClient()
  await supabase.from('event_requests').delete().eq('id', requestId)
  revalidatePath(`/admin/events/${eventId}`)
}
