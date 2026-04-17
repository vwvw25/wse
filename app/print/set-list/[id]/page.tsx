import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { SetList, SetListSong } from '@/types/set-list'
import PrintButton from './PrintButton'

export default async function SetListPrintPage({ params }: { params: Promise<{ id: string }> }) {
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

  const meta = sl.is_template ? 'Template' : [
    formatDate(sl.event?.event_date ?? null),
    sl.event?.venue_name,
    sl.event?.request_details?.sets_requested ?? null,
    sl.event?.start_time && sl.event?.finish_time
      ? `${sl.event.start_time}–${sl.event.finish_time}`
      : (sl.event?.start_time ?? null),
  ].filter(Boolean).join(' · ')

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#111',
      padding: '40px 48px', maxWidth: 680, margin: '0 auto',
    }}>
      <style>{`
        html, body {
          background: #fff !important;
          color: #111 !important;
        }
        @media print {
          html, body { margin: 0; background: #fff !important; }
          .no-print { display: none !important; }
          @page { margin: 20mm; size: A4; }
        }
        .set-heading {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: #666;
          margin: 20px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px;
        }
        tr:last-child td { border-bottom: none; }
      `}</style>

      {/* Header */}
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{sl.name}</h1>
      {meta && <p style={{ fontSize: 12, color: '#555', margin: '0 0 28px' }}>{meta}</p>}

      {/* Sets */}
      {setNumbers.map(n => {
        const setSongs = songs.filter(s => s.set_number === n)
        if (!setSongs.length) return null
        return (
          <div key={n}>
            <div className="set-heading">Set {n} — {setSongs.length} songs</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {setSongs.map((sls, i) => (
                  <tr key={sls.id}>
                    <td style={{ width: 28, padding: '5px 8px 5px 0', borderBottom: '0.5px solid #eee', color: '#aaa', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '5px 8px 5px 0', borderBottom: '0.5px solid #eee', fontWeight: 500 }}>{sls.song?.title ?? '—'}</td>
                    <td style={{ padding: '5px 8px 5px 0', borderBottom: '0.5px solid #eee', color: '#555' }}>{sls.song?.artist ?? ''}</td>
                    <td style={{ padding: '5px 0', borderBottom: '0.5px solid #eee', color: '#888', fontSize: 11, width: 60 }}>{sls.song?.key ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {/* Unassigned */}
      {songs.filter(s => s.set_number == null).length > 0 && (
        <div>
          <div className="set-heading">Unassigned</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {songs.filter(s => s.set_number == null).map((sls, i) => (
                <tr key={sls.id}>
                  <td style={{ width: 28, padding: '5px 8px 5px 0', borderBottom: '0.5px solid #eee', color: '#aaa', fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: '5px 8px 5px 0', borderBottom: '0.5px solid #eee', fontWeight: 500 }}>{sls.song?.title ?? '—'}</td>
                  <td style={{ padding: '5px 8px 5px 0', borderBottom: '0.5px solid #eee', color: '#555' }}>{sls.song?.artist ?? ''}</td>
                  <td style={{ padding: '5px 0', borderBottom: '0.5px solid #eee', color: '#888', fontSize: 11, width: 60 }}>{sls.song?.key ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="no-print">
        <PrintButton backHref={`/admin/set-lists/${id}`} />
      </div>
    </div>
  )
}
