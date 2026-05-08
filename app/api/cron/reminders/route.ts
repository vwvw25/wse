import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { musicianFullName } from '@/types/musicians'
import { sendEmail } from '@/lib/send-email'
import { getBaseUrl } from '@/lib/get-base-url'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t: string | null) {
  return t ?? '—'
}

function buildReminderHtml({
  musicianName,
  instrument,
  eventDate,
  venueName,
  venueAddress,
  location,
  arrivalTime,
  startTime,
  finishTime,
  deadlineAt,
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
  deadlineAt: Date
  yesUrl: string
  noUrl: string
}) {
  const deadlineStr = deadlineAt.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#111827;padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">Availability reminder</div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#374151;margin:0 0 20px;">Hi ${musicianName},</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        This is a reminder — we haven't heard back from you yet. Please confirm your availability by <strong>${deadlineStr}</strong>.
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
        If you have any questions, reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorised calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  // Find slots that need a reminder:
  // - email was sent (email_sent_at IS NOT NULL)
  // - still awaiting response (availability = 'tbc')
  // - reminder not yet sent (reminder_sent_at IS NULL)
  // - half the deadline period has elapsed since email was sent
  const { data: slots, error } = await supabase
    .from('event_musicians')
    .select('*, musician:musicians(*), event:events(*)')
    .eq('availability', 'email_sent')
    .not('email_sent_at', 'is', null)
    .is('reminder_sent_at', null)

  if (error) {
    console.error('reminders cron error fetching slots:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const toRemind = (slots ?? []).filter(slot => {
    const sentAt = new Date(slot.email_sent_at)
    const deadlineHours = slot.deadline_hours ?? 24
    const halfwayMs = (deadlineHours / 2) * 60 * 60 * 1000
    return now.getTime() >= sentAt.getTime() + halfwayMs
  })

  let sent = 0
  let failed = 0

  for (const slot of toRemind) {
    const musician = slot.musician
    if (!musician?.email) continue

    const event = slot.event
    const musicianName = musicianFullName(musician)
    const sentAt = new Date(slot.email_sent_at)
    const deadlineAt = new Date(sentAt.getTime() + (slot.deadline_hours ?? 24) * 60 * 60 * 1000)
    const token = slot.token
    const baseUrl = getBaseUrl(req)
    const yesUrl = `${baseUrl}/availability/${token}?response=yes`
    const noUrl = `${baseUrl}/availability/${token}?response=no`

    const html = buildReminderHtml({
      musicianName,
      instrument: slot.instrument,
      eventDate: event.event_date,
      venueName: event.venue_name,
      venueAddress: event.venue_address,
      location: event.location,
      arrivalTime: event.arrival_time,
      startTime: event.start_time,
      finishTime: event.finish_time,
      deadlineAt,
      yesUrl,
      noUrl,
    })

    try {
      const result = await sendEmail({
        type: 'availability_reminder',
        to: musician.email,
        recipientName: musicianName,
        subject: `Availability reminder — ${formatDate(event.event_date)}`,
        html,
      })

      // Always record reminder status + log id
      await supabase
        .from('event_musicians')
        .update({
          reminder_status: result.ok ? 'sent' : 'failed',
          reminder_email_log_id: result.emailLogId || null,
        })
        .eq('id', slot.id)

      // Only advance availability if musician hasn't already responded
      await supabase
        .from('event_musicians')
        .update({ reminder_sent_at: now.toISOString(), availability: 'reminder_sent' })
        .eq('id', slot.id)
        .in('availability', ['email_sent', 'reminder_sent'])

      sent++
    } catch (err) {
      console.error(`Failed to send reminder for slot ${slot.id}:`, err)
      failed++
    }
  }

  return NextResponse.json({ ok: true, sent, failed, checked: toRemind.length })
}
