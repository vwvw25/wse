import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { SetList, SetListSong } from '@/types/set-list'
import CopyLinkButton from './CopyLinkButton'

export default async function PublicSetListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: slData }, { data: songsData }] = await Promise.all([
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
  ])

  if (!slData) notFound()

  const sl = slData as SetList & {
    event?: {
      event_date: string | null
      venue_name: string | null
      start_time: string | null
      finish_time: string | null
      request_details?: { sets_requested?: string | null } | null
    } | null
  }
  const songs = (songsData ?? []) as SetListSong[]

  function parseSetsCount(s: string | null) {
    if (!s) return 1
    const m = s.match(/^(\d+)/)
    return m ? parseInt(m[1]) : 1
  }

  const setsCount = parseSetsCount(sl.event?.request_details?.sets_requested ?? null)
  const setNumbers = Array.from({ length: setsCount }, (_, i) => i + 1)

  function formatDate(d: string | null) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const meta = [
    formatDate(sl.event?.event_date ?? null),
    sl.event?.venue_name,
    sl.event?.request_details?.sets_requested ?? null,
    sl.event?.start_time && sl.event?.finish_time
      ? `${sl.event.start_time}–${sl.event.finish_time}`
      : (sl.event?.start_time ?? null),
  ].filter(Boolean).join(' · ')

  const unassigned = songs.filter(s => s.set_number == null)

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #fff; color: #111; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; }
        @media print {
          .no-print { display: none !important; }
          @page { margin: 18mm; size: A4; }
        }
      `}</style>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 32px 64px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 6 }}>{sl.name}</h1>
          {meta && <p style={{ fontSize: 13, color: '#555' }}>{meta}</p>}
        </div>

        {/* Sets */}
        {setNumbers.map(n => {
          const setSongs = songs.filter(s => s.set_number === n)
          if (!setSongs.length) return null
          return (
            <div key={n} style={{ marginBottom: 40 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                color: '#888', borderBottom: '1px solid #e5e5e5', paddingBottom: 6, marginBottom: 4,
              }}>
                Set {n} — {setSongs.length} songs
              </div>
              {setSongs.map((sls, i) => (
                <SongRow key={sls.id} sls={sls} idx={i} />
              ))}
            </div>
          )
        })}

        {unassigned.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
              color: '#888', borderBottom: '1px solid #e5e5e5', paddingBottom: 6, marginBottom: 4,
            }}>
              Unassigned — {unassigned.length} songs
            </div>
            {unassigned.map((sls, i) => (
              <SongRow key={sls.id} sls={sls} idx={i} />
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="no-print" style={{ marginTop: 16, paddingTop: 24, borderTop: '1px solid #e5e5e5' }}>
          <CopyLinkButton />
        </div>
      </div>
    </>
  )
}

function SongRow({ sls, idx }: { sls: SetListSong; idx: number }) {
  const song = sls.song
  if (!song) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr',
      gap: '0 12px',
      padding: '10px 0',
      borderBottom: '0.5px solid #f0f0f0',
      alignItems: 'start',
    }}>
      {/* Number */}
      <span style={{ fontSize: 11, color: '#bbb', paddingTop: 2, textAlign: 'right' }}>{idx + 1}</span>

      {/* Content */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          {song.link
            ? <a href={song.link} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 600, color: '#111', textDecoration: 'underline', textDecorationColor: '#ccc' }}>{song.title}</a>
            : <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{song.title}</span>
          }
          {song.artist && <span style={{ fontSize: 13, color: '#555' }}>{song.artist}</span>}
          {song.key && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#888',
              background: '#f5f5f5', padding: '1px 7px', borderRadius: 4,
            }}>{song.key}</span>
          )}
        </div>

        {/* Tags */}
        {song.tags && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
            {song.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
              <span key={tag} style={{
                fontSize: 11, color: '#888',
                background: '#f5f5f5', padding: '1px 8px', borderRadius: 20,
              }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Notes */}
        {song.notes && (
          <p style={{ fontSize: 12, color: '#888', marginTop: 4, fontStyle: 'italic' }}>{song.notes}</p>
        )}
      </div>
    </div>
  )
}
