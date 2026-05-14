import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { SetList, SetListSong, Song, TagOption } from '@/types/set-list'
import type { EventRequest } from '@/types/event-request'
import SetListEditor from './SetListEditor'

export default async function SetListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: slData }, { data: songsData }, { data: allSongsData }, { data: tagOptionsData }] = await Promise.all([
    supabase
      .from('set_lists')
      .select(`*, event:events(id, event_date, venue_name, start_time, finish_time, request_details)`)
      .eq('id', id)
      .single(),
    supabase
      .from('set_list_songs')
      .select(`*, song:songs(*)`)
      .eq('set_list_id', id)
      .order('set_number', { ascending: true, nullsFirst: false })
      .order('position', { ascending: true }),
    supabase.from('songs').select('*').order('title'),
    supabase.from('tag_options').select('*').order('category').order('sort_order'),
  ])

  if (!slData) notFound()

  // Fetch templates for "apply template" feature
  const { data: templatesData } = await supabase
    .from('set_lists')
    .select('id, name')
    .eq('is_template', true)
    .order('name')

  // Fetch event requests if this set list is linked to an event
  let eventRequests: EventRequest[] = []
  const eventId = (slData as SetList).event_id
  if (eventId) {
    const { data: requestsData } = await supabase
      .from('event_requests')
      .select('*')
      .eq('event_id', eventId)
      .neq('status', 'declined')
      .not('song_id', 'is', null)
      .order('created_at')
    eventRequests = (requestsData ?? []) as EventRequest[]
  }

  return (
    <SetListEditor
      setList={slData as SetList}
      setListSongs={(songsData ?? []) as SetListSong[]}
      allSongs={(allSongsData ?? []) as Song[]}
      templates={(templatesData ?? []) as { id: string; name: string }[]}
      tagOptions={(tagOptionsData ?? []) as TagOption[]}
      eventRequests={eventRequests}
    />
  )
}
