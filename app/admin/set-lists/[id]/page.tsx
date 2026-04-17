import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { SetList, SetListSong, Song, TagOption } from '@/types/set-list'
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

  return (
    <SetListEditor
      setList={slData as SetList}
      setListSongs={(songsData ?? []) as SetListSong[]}
      allSongs={(allSongsData ?? []) as Song[]}
      templates={(templatesData ?? []) as { id: string; name: string }[]}
      tagOptions={(tagOptionsData ?? []) as TagOption[]}
    />
  )
}
