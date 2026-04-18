import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { EventRecord } from '@/types/quote'

function esc(v: string | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const events = (data ?? []) as EventRecord[]

  const headers = [
    'Date', 'Status', 'Agency / Client', 'Agent', 'Client email',
    'Venue', 'Postcode', 'Location', 'Guests',
    'Arrival', 'Start', 'Finish', 'Load out',
    'Band size requested', 'Sets requested',
    'Special requirements', 'Sound requirements', 'Notes',
    'Created',
  ]

  const rows = events.map(ev => {
    const rd = ev.request_details
    return [
      esc(ev.event_date),
      esc(ev.status),
      esc(ev.agency_name),
      esc(ev.agent_name),
      esc(ev.client_email),
      esc(ev.venue_name),
      esc(ev.venue_postcode),
      esc(ev.location),
      esc(ev.guests != null ? String(ev.guests) : null),
      esc(ev.arrival_time),
      esc(ev.start_time),
      esc(ev.finish_time),
      esc(ev.load_out_time),
      esc(rd?.band_size_requested),
      esc(rd?.sets_requested),
      esc(rd?.special_requirements),
      esc(rd?.sound_requirements),
      esc(rd?.notes),
      esc(ev.created_at?.slice(0, 10)),
    ].join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="events-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
