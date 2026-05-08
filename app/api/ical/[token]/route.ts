import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

function toICalDate(date: string, time: string | null): string {
  const d = date.replace(/-/g, '')
  if (!time) return `${d}T000000`
  const t = time.replace(/:/g, '').slice(0, 6).padEnd(6, '0')
  return `${d}T${t}`
}

function escapeIcal(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServiceClient()

  // Look up by musician_invites.token — joins to slot + event
  const { data: invite } = await supabase
    .from('musician_invites')
    .select('*, slot:event_musicians(*, event:events(*))')
    .eq('token', token)
    .single()

  if (!invite) {
    return new NextResponse('Not found', { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slot = invite.slot as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = slot?.event as Record<string, string | null>

  if (!slot || !event) {
    return new NextResponse('Not found', { status: 404 })
  }

  const eventDate = event.event_date as string
  const startDt = toICalDate(eventDate, event.start_time as string | null)
  const endDt = toICalDate(eventDate, event.finish_time as string | null)

  // Use venue name (not agent/agency) for musician-facing calendar event title
  const eventTitle = (event.venue_name as string | null) ?? (eventDate ? new Date(eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'WSE Event')

  const locationParts = [event.venue_name, event.venue_address ?? event.location].filter(Boolean)
  const location = locationParts.join(', ')

  const descLines = [
    `Your role: ${slot.instrument as string}`,
    event.arrival_time ? `Arrival: ${event.arrival_time}` : null,
    event.start_time ? `Start: ${event.start_time}` : null,
    event.finish_time ? `Finish: ${event.finish_time}` : null,
  ].filter(Boolean) as string[]

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ward Smith Entertainment//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:wse-${token}@wardsmithentertainment.com`,
    `DTSTART:${startDt}`,
    `DTEND:${endDt}`,
    `SUMMARY:${escapeIcal(`WSE — ${eventTitle}`)}`,
    location ? `LOCATION:${escapeIcal(location)}` : null,
    `DESCRIPTION:${escapeIcal(descLines.join('\\n'))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="wse-event.ics"`,
    },
  })
}
