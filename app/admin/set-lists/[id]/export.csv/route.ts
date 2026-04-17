import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { SetList, SetListSong } from '@/types/set-list'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: slData }, { data: songsData }] = await Promise.all([
    supabase.from('set_lists').select('*, event:events(event_date, venue_name)').eq('id', id).single(),
    supabase
      .from('set_list_songs')
      .select('*, song:songs(*)')
      .eq('set_list_id', id)
      .order('set_number', { ascending: true, nullsFirst: false })
      .order('position', { ascending: true }),
  ])

  if (!slData) return new NextResponse('Not found', { status: 404 })

  const sl = slData as SetList
  const songs = (songsData ?? []) as SetListSong[]

  const rows = [
    ['Set', 'Position', 'Title', 'Artist', 'Key', 'Tags', 'Notes', 'Link'],
    ...songs.map((s) => [
      s.set_number != null ? String(s.set_number) : 'Unassigned',
      String(s.position + 1),
      s.song?.title ?? '',
      s.song?.artist ?? '',
      s.song?.key ?? '',
      s.song?.tags ?? '',
      s.song?.notes ?? '',
      s.song?.link ?? '',
    ]),
  ]

  const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const filename = `${sl.name.replace(/[^a-z0-9]/gi, '-')}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
