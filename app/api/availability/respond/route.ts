import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/send-email'
import { musicianFullName } from '@/types/musicians'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function toGCalDate(date: string | null, time: string | null): string {
  if (!date) return ''
  const d = date.replace(/-/g, '')
  if (!time) return `${d}T000000Z`
  const t = time.replace(/:/g, '').slice(0, 6).padEnd(6, '0')
  return `${d}T${t}Z`
}

function buildConfirmationEmail({
  musicianName,
  instrument,
  fee,
  eventDate,
  venueName,
  venueAddress,
  location,
  arrivalTime,
  startTime,
  finishTime,
  band,
  lineup,
  sets,
  food,
  dietaryRequirements,
  googleCalUrl,
  icalUrl,
  gifUrl,
}: {
  musicianName: string
  instrument: string
  fee: number
  eventDate: string | null
  venueName: string | null
  venueAddress: string | null
  location: string | null
  arrivalTime: string | null
  startTime: string | null
  finishTime: string | null
  band: string | null
  lineup: string | null
  sets: string | null
  food: 'yes' | 'no' | 'tbc'
  dietaryRequirements: string[]
  googleCalUrl: string
  icalUrl: string
  gifUrl: string | null
}): string {
  const dietaryDisplay = dietaryRequirements.length > 0
    ? `${dietaryRequirements.map(d => d.replace(/_/g, ' ')).join(', ')} — if these have changed, please get in touch.`
    : 'None'

  const rows: [string, string][] = [
    ['Date', formatDate(eventDate)],
    ...(venueName ? [['Venue', `${venueName}${location ? `, ${location}` : ''}`] as [string, string]] : []),
    ...(venueAddress ? [['Address', venueAddress] as [string, string]] : []),
    ...(arrivalTime ? [['Arrival', arrivalTime] as [string, string]] : []),
    ['Start / Finish', `${startTime ?? '—'} – ${finishTime ?? '—'}`],
    ...(band ? [['Band', band] as [string, string]] : []),
    ...(lineup ? [['Line-up', lineup] as [string, string]] : []),
    ...(sets ? [['Sets', sets] as [string, string]] : []),
    ['Food', food === 'yes' ? 'Yes' : food === 'no' ? 'No' : 'TBC'],
    ['Your role', instrument],
    ['Fee', `£${fee.toFixed(2)}`],
    ...(food === 'yes' ? [['Your dietaries', dietaryDisplay] as [string, string]] : []),
  ]

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">Gig confirmed ✓</div>
    </div>
    <div style="padding:28px 32px;">
      ${gifUrl ? `<img src="${gifUrl}" alt="" style="width:100%;border-radius:6px;display:block;margin-bottom:20px;" />` : ''}
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">Hi <strong>${musicianName}</strong>,</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        Thanks for confirming — you're booked in for the following event.
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          ${rows.map(([label, value]) => `
          <tr>
            <td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:110px;vertical-align:top;">${label}</td>
            <td style="padding:5px 0;font-size:13px;color:#111827;">${value}</td>
          </tr>`).join('')}
        </table>
      </div>

      <p style="font-size:13px;color:#374151;margin:0 0 20px;">
        Add this event to your calendar:
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding-right:8px;">
            <a href="${googleCalUrl}" target="_blank" style="display:block;text-align:center;padding:11px 0;background:#4285f4;color:#fff;font-size:13px;font-weight:600;border-radius:6px;text-decoration:none;">
              Google Calendar
            </a>
          </td>
          <td style="padding-left:8px;">
            <a href="${icalUrl}" style="display:block;text-align:center;padding:11px 0;background:#374151;color:#fff;font-size:13px;font-weight:600;border-radius:6px;text-decoration:none;">
              Download (.ics)
            </a>
          </td>
        </tr>
      </table>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 16px;margin-bottom:24px;">
        <p style="font-size:13px;color:#78350f;margin:0;">
          If any of your details have changed (including dietaries) please get in touch by email to update.
        </p>
      </div>

      <p style="font-size:12px;color:#9ca3af;margin:0;">
        If you have any questions, reply to this email and we'll be happy to help.
      </p>
    </div>
  </div>
</body>
</html>`
}

const pendingStates = ['tbc', 'email_sent', 'reminder_sent']

export async function POST(req: NextRequest) {
  let token = 'unknown'

  try {
    const body = await req.json() as { token: string; response: 'yes' | 'no'; idempotencyKey: string }
    token = body.token ?? 'unknown'
    const { response, idempotencyKey } = body

    if (!token || (response !== 'yes' && response !== 'no') || !idempotencyKey) {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const [{ data: invite }, { data: gifs }] = await Promise.all([
      supabase
        .from('musician_invites')
        .select('*, slot:event_musicians(*, event:events(*, booked_template:band_templates!booked_band_template_id(name))), musician:musicians(*)')
        .eq('token', token)
        .single(),
      supabase
        .from('celebration_gifs')
        .select('url'),
    ])

    if (!invite) {
      return NextResponse.json({ ok: false, error: 'Invite not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slot = invite.slot as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const musician = invite.musician as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = slot?.event as any

    if (!slot || !event) {
      return NextResponse.json({ ok: false, error: 'Event data not found' }, { status: 404 })
    }

    const musicianName = musician ? musicianFullName(musician) : 'Musician'
    const availability = response

    // Idempotency: already recorded — return existing result
    if (!pendingStates.includes(invite.availability)) {
      return NextResponse.json({ ok: true, availability: invite.availability, alreadyRecorded: true })
    }

    // Stamp link_clicked_at
    await supabase
      .from('musician_invites')
      .update({ link_clicked_at: new Date().toISOString() })
      .eq('token', token)

    const emailStatus = availability === 'yes' ? 'accepted' : 'declined'
    const statusUpdate = invite.reminder_sent_at
      ? { reminder_status: emailStatus }
      : { invite_status: emailStatus }

    // Phase 1: update invite
    const { error: inviteUpdateError } = await supabase
      .from('musician_invites')
      .update({ availability, ...statusUpdate })
      .eq('token', token)

    if (inviteUpdateError) throw new Error(`Invite update failed: ${inviteUpdateError.message}`)

    // Phase 2: update slot — if this fails, roll back invite so musician can retry
    const { error: slotUpdateError } = await supabase
      .from('event_musicians')
      .update({ availability })
      .eq('id', slot.id)

    if (slotUpdateError) {
      await supabase
        .from('musician_invites')
        .update({ availability: 'tbc', invite_status: null, reminder_status: null })
        .eq('token', token)
      throw new Error(`Slot update failed: ${slotUpdateError.message}`)
    }

    // If declined: cascade to next musician in preference order (fire-and-forget)
    if (availability === 'no') {
      const { data: prefOrder } = await supabase
        .from('preference_orders')
        .select('*, musician:musicians(*)')
        .eq('instrument', slot.instrument)
        .order('rank')

      if (prefOrder && prefOrder.length > 0) {
        const currentIdx = prefOrder.findIndex((p: { musician_id: string }) => p.musician_id === invite.musician_id)
        const next = prefOrder[currentIdx + 1]

        if (next?.musician?.email) {
          const { data: newSlot } = await supabase
            .from('event_musicians')
            .insert({
              event_id: slot.event_id,
              musician_id: next.musician_id,
              instrument: slot.instrument,
              fee: next.musician.default_fee ?? 0,
              additional_costs: 0,
              availability: 'tbc',
              deadline_hours: slot.deadline_hours ?? 24,
            })
            .select()
            .single()

          if (newSlot) {
            fetch(`${req.nextUrl.origin}/api/musicians/send-availability`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slotId: newSlot.id }),
            }).catch(() => {})
          }
        }
      }
    }

    // Confirmation email for 'yes'
    if (availability === 'yes' && musician?.email) {
      try {
        const eventDate = event.event_date as string | null
        const gcStart = toGCalDate(eventDate, event.start_time as string | null)
        const gcEnd = toGCalDate(eventDate, event.finish_time as string | null)
        const gcEventTitle = (event.venue_name as string | null) ?? formatDate(event.event_date as string | null)
        const gcTitle = encodeURIComponent(`WSE — ${gcEventTitle}`)
        const gcLocation = encodeURIComponent([event.venue_name, event.venue_address ?? event.location].filter(Boolean).join(', '))
        const gcDetails = encodeURIComponent(`Your role: ${slot.instrument}`)
        const googleCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${gcTitle}&dates=${gcStart}/${gcEnd}&location=${gcLocation}&details=${gcDetails}`
        const icalUrl = `${req.nextUrl.origin}/api/ical/${token}`

        const gifUrls = (gifs ?? []).map((g: { url: string }) => g.url)
        const randomGif = gifUrls.length > 0
          ? gifUrls[Math.floor(Math.random() * gifUrls.length)]
          : null

        await sendEmail({
          type: 'confirmation',
          to: musician.email as string,
          recipientName: musicianName,
          subject: `Gig confirmed — ${formatDate(event.event_date as string | null)}`,
          html: buildConfirmationEmail({
            musicianName,
            instrument: slot.instrument as string,
            fee: (slot.fee as number | null) ?? 0,
            eventDate,
            venueName: event.venue_name as string | null,
            venueAddress: event.venue_address as string | null,
            location: event.location as string | null,
            arrivalTime: event.arrival_time as string | null,
            startTime: event.start_time as string | null,
            finishTime: event.finish_time as string | null,
            band: (event.booked_template as { name: string } | null)?.name ?? null,
            lineup: (event.booked_lineup as string | null) ?? null,
            sets: (event.booked_sets as string | null) ?? null,
            food: (event.food as 'yes' | 'no' | 'tbc' | null) ?? 'tbc',
            dietaryRequirements: (musician?.dietary_requirements as string[] | null) ?? [],
            googleCalUrl,
            icalUrl,
            gifUrl: randomGif,
          }),
        })
      } catch (e) {
        // Email failure is non-fatal — booking is already confirmed in DB
        console.error('confirmation email error:', e)
      }
    }

    return NextResponse.json({ ok: true, availability })

  } catch (err) {
    console.error('availability respond error:', err)
    const errMsg = err instanceof Error ? err.message : String(err)

    // Best-effort admin notification
    try {
      const supabase = createServiceClient()
      await supabase.from('notifications').insert({
        type: 'response_failed',
        message: `⚠️ Musician response FAILED to record. Error: ${errMsg}. Token: ${token}`,
        link: `/admin/musicians`,
      })
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 })
  }
}
