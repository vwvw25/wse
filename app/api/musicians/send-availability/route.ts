import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { musicianFullName } from '@/types/musicians'
import { sendEmail } from '@/lib/send-email'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wse.vercel.app'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t: string | null) {
  return t ?? '—'
}

function deadlineText(sentAt: Date, deadlineHours: number) {
  const deadline = new Date(sentAt.getTime() + deadlineHours * 60 * 60 * 1000)
  return deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function buildEmailHtml({
  musicianName,
  instrument,
  eventDate,
  venueName,
  venueAddress,
  location,
  arrivalTime,
  startTime,
  finishTime,
  deadlineHours,
  sentAt,
  yesUrl,
  noUrl,
}: {
  musicianName: string
  instrument: string
  eventDate: string | null
  venueName: string | null
  venueAddress: string | null
  location: string | null
  arrivalTime: string | null
  startTime: string | null
  finishTime: string | null
  deadlineHours: number
  sentAt: Date
  yesUrl: string
  noUrl: string
}) {
  const deadlineDt = deadlineText(sentAt, deadlineHours)

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#111827;padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">Availability request</div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#374151;margin:0 0 20px;">Hi ${musicianName},</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        We'd like to check your availability for the following event. Please confirm by <strong>${deadlineDt}</strong>.
      </p>

      <!-- Event details -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:110px;">Date</td>
            <td style="padding:5px 0;font-size:13px;color:#111827;">${formatDate(eventDate)}</td>
          </tr>
          ${venueName ? `<tr>
            <td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Venue</td>
            <td style="padding:5px 0;font-size:13px;color:#111827;">${venueName}${location ? `, ${location}` : ''}</td>
          </tr>` : ''}
          ${venueAddress ? `<tr>
            <td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Address</td>
            <td style="padding:5px 0;font-size:13px;color:#111827;">${venueAddress}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Arrival</td>
            <td style="padding:5px 0;font-size:13px;color:#111827;">${formatTime(arrivalTime)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Start / Finish</td>
            <td style="padding:5px 0;font-size:13px;color:#111827;">${formatTime(startTime)} – ${formatTime(finishTime)}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Your role</td>
            <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600;">${instrument}</td>
          </tr>
        </table>
      </div>

      <!-- CTA buttons -->
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding-right:8px;">
            <a href="${yesUrl}" style="display:block;text-align:center;padding:12px 0;background:#16a34a;color:#fff;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none;">
              ✓ Yes, I'm available
            </a>
          </td>
          <td style="padding-left:8px;">
            <a href="${noUrl}" style="display:block;text-align:center;padding:12px 0;background:#dc2626;color:#fff;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none;">
              ✗ Not available
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;">
        Please respond by ${deadlineDt}. If you have any questions, reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { slotId } = await req.json()
    if (!slotId) return NextResponse.json({ error: 'slotId required' }, { status: 400 })

    const supabase = createServiceClient()

    // Fetch slot + musician + event
    const { data: slot, error: slotErr } = await supabase
      .from('event_musicians')
      .select('*, musician:musicians(*), event:events(*)')
      .eq('id', slotId)
      .single()

    if (slotErr || !slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

    const musician = slot.musician
    if (!musician?.email) return NextResponse.json({ error: 'Musician has no email address' }, { status: 400 })

    const event = slot.event
    const musicianName = musicianFullName(musician)
    const sentAt = new Date()
    const token = slot.token
    const yesUrl = `${BASE_URL}/availability/${token}?response=yes`
    const noUrl = `${BASE_URL}/availability/${token}?response=no`

    const html = buildEmailHtml({
      musicianName,
      instrument: slot.instrument,
      eventDate: event.event_date,
      venueName: event.venue_name,
      venueAddress: event.venue_address,
      location: event.location,
      arrivalTime: event.arrival_time,
      startTime: event.start_time,
      finishTime: event.finish_time,
      deadlineHours: slot.deadline_hours ?? 24,
      sentAt,
      yesUrl,
      noUrl,
    })

    const result = await sendEmail({
      type: 'availability',
      to: musician.email,
      recipientName: musicianName,
      subject: `Event Invite — ${formatDate(event.event_date)}`,
      html,
    })

    // Always record invite status + log id
    await supabase
      .from('event_musicians')
      .update({
        invite_status: result.ok ? 'sent' : 'failed',
        invite_email_log_id: result.emailLogId || null,
      })
      .eq('id', slotId)

    // Only advance availability if the musician hasn't already responded
    await supabase
      .from('event_musicians')
      .update({ email_sent_at: sentAt.toISOString(), availability: 'email_sent' })
      .eq('id', slotId)
      .in('availability', ['tbc', 'email_sent'])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('send-availability error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
