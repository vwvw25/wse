import { createServiceClient } from '@/lib/supabase'
import type { Song, SetList, TagOption } from '@/types/set-list'
import SetListsClient from './SetListsClient'

export default async function SetListsPage() {
  const supabase = createServiceClient()

  const [{ data: songsData }, { data: setListsData }, { data: eventsData }, { data: tagOptionsData }] = await Promise.all([
    supabase.from('songs').select('*').order('title'),
    supabase
      .from('set_lists')
      .select(`*, event:events(id, event_date, venue_name)`)
      .order('created_at', { ascending: false }),
    supabase.from('events').select('id, event_date, venue_name').order('event_date', { ascending: false }),
    supabase.from('tag_options').select('*').order('category').order('sort_order'),
  ])

  // Attach song counts
  const setLists = (setListsData ?? []) as SetList[]
  if (setLists.length) {
    const { data: counts } = await supabase
      .from('set_list_songs')
      .select('set_list_id')
    const countMap: Record<string, number> = {}
    for (const row of counts ?? []) {
      countMap[row.set_list_id] = (countMap[row.set_list_id] ?? 0) + 1
    }
    setLists.forEach(sl => { sl.song_count = countMap[sl.id] ?? 0 })
  }

  return (
    <SetListsClient
      songs={(songsData ?? []) as Song[]}
      setLists={setLists}
      events={(eventsData ?? []) as { id: string; event_date: string | null; venue_name: string | null }[]}
      tagOptions={(tagOptionsData ?? []) as TagOption[]}
    />
  )
}
