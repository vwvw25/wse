import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/send-email'
import { musicianFullName } from '@/types/musicians'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Cascade helper ────────────────────────────────────────────────────────────
// Called when a musician declines or a deadline expires.
// Finds the next musician from the slot's cascade template (or falls back to
// preference_orders), then updates the existing slot in-place and sends a new invite.
export async function triggerCascade({
  supabase,
  slot,
  currentMusicianId,
  origin,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slot: Record<string, any>
  currentMusicianId: string
  origin: string
}) {
  // Supabase returns joined data as arrays — normalise to flat objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function normaliseMusician(raw: any): { email: string | null; default_fee: number } | null {
    if (!raw) return null
    if (Array.isArray(raw)) return raw[0] ?? null
    return raw
  }

  // Determine the ordered musician list: cascade template > preference_orders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderedMusicians: { musician_id: string; _raw_musician: any }[] = []

  if (slot.cascade_template_id) {
    const { data: templateMusicians } = await supabase
      .from('cascade_template_musicians')
      .select('musician_id, musician:musicians(email, default_fee)')
      .eq('template_id', slot.cascade_template_id)
      .order('rank')
    orderedMusicians = (templateMusicians ?? []).map((r: Record<string, unknown>) => ({ musician_id: r.musician_id as string, _raw_musician: r.musician }))
  } else {
    // Fall back to preference_orders for backwards compatibility
    const { data: prefOrder } = await supabase
      .from('preference_orders')
      .select('musician_id, musician:musicians(email, default_fee)')
      .eq('instrument', slot.instrument)
      .order('rank')
    orderedMusicians = (prefOrder ?? []).map((r: Record<string, unknown>) => ({ musician_id: r.musician_id as string, _raw_musician: r.musician }))
  }

  if (orderedMusicians.length === 0) return

  // Get all musicians already invited for this slot (to avoid re-inviting)
  const { data: existingInvites } = await supabase
    .from('musician_invites')
    .select('musician_id')
    .eq('slot_id', slot.id)

  const alreadyInvited = new Set((existingInvites ?? []).map((i: { musician_id: string }) => i.musician_id))

  // Also skip musicians already confirmed on any other slot for this event (avoid double-booking)
  const { data: confirmedElsewhere } = await supabase
    .from('event_musicians')
    .select('musician_id')
    .eq('event_id', slot.event_id)
    .eq('availability', 'yes')
    .neq('id', slot.id)

  const confirmedOnEvent = new Set((confirmedElsewhere ?? []).map((s: { musician_id: string }) => s.musician_id))

  // Find the next musician after current who hasn't already been invited and isn't already confirmed elsewhere
  const currentIdx = orderedMusicians.findIndex(p => p.musician_id === currentMusicianId)
  let nextEntry: typeof orderedMusicians[0] | undefined
  for (let i = currentIdx + 1; i < orderedMusicians.length; i++) {
    if (!alreadyInvited.has(orderedMusicians[i].musician_id) && !confirmedOnEvent.has(orderedMusicians[i].musician_id)) {
      nextEntry = orderedMusicians[i]
      break
    }
  }

  if (!nextEntry) return
  const nextMusician = normaliseMusician(nextEntry._raw_musician)
  if (!nextMusician?.email) return

  // Update the existing slot in-place (don't create a new slot)
  await supabase
    .from('event_musicians')
    .update({
      musician_id: nextEntry.musician_id,
      fee: nextMusician.default_fee ?? 0,
      availability: 'tbc',
    })
    .eq('id', slot.id)

  // Send availability invite to next musician
  fetch(`${origin}/api/musicians/send-availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId: slot.id }),
  }).catch(() => {})
}

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

export function buildAdminNotificationEmail({
  musicianName,
  instrument,
  fee,
  response,
  eventDate,
  venueName,
  eventId,
  origin,
}: {
  musicianName: string
  instrument: string
  fee: number
  response: 'yes' | 'no'
  eventDate: string | null
  venueName: string | null
  eventId: string
  origin: string
}): string {
  const accepted = response === 'yes'
  const statusColor = accepted ? '#16a34a' : '#dc2626'
  const statusText = accepted ? 'Accepted' : 'Declined'

  const rows: [string, string][] = [
    ['Musician', musicianName],
    ['Instrument', instrument],
    ['Date', formatDate(eventDate)],
    ...(venueName ? [['Venue', venueName] as [string, string]] : []),
    ...(accepted ? [['Fee', `£${fee.toFixed(2)}`] as [string, string]] : []),
    ['Response', statusText],
  ]

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:20px 28px;">
      <div style="font-size:12px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:18px;font-weight:700;color:#fff;margin-top:4px;">Musician response received</div>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:14px;color:#374151;margin:0 0 20px;">
        <strong>${musicianName}</strong> has <span style="color:${statusColor};font-weight:600;">${statusText.toLowerCase()}</span> their availability request.
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          ${rows.map(([label, value]) => `
          <tr>
            <td style="padding:4px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:90px;vertical-align:top;">${label}</td>
            <td style="padding:4px 0;font-size:13px;color:${label === 'Response' ? statusColor : '#111827'};${label === 'Response' ? 'font-weight:600;' : ''}">${value}</td>
          </tr>`).join('')}
        </table>
      </div>
      <a href="${origin}/admin/events/${eventId}/musicians" style="display:block;text-align:center;padding:11px 0;background:#111827;color:#fff;font-size:13px;font-weight:600;border-radius:6px;text-decoration:none;">
        View event musicians →
      </a>
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

    // Deadline check: if the response window has passed, expire the invite and cascade rather than accept/decline
    if (invite.email_sent_at) {
      const deadlineHours = ((slot?.deadline_hours ?? invite.deadline_hours ?? 24)) as number
      const sentAt = new Date(invite.email_sent_at as string)
      const deadlineAt = new Date(sentAt.getTime() + deadlineHours * 60 * 60 * 1000)
      if (new Date() >= deadlineAt) {
        await supabase
          .from('musician_invites')
          .update({ availability: 'deadline_expired' })
          .eq('token', token)
        if (slot.cascade_enabled !== false) {
          triggerCascade({ supabase, slot, currentMusicianId: invite.musician_id as string, origin: req.nextUrl.origin }).catch(() => {})
        }
        return NextResponse.json({ ok: false, error: 'deadline_expired' }, { status: 410 })
      }
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

    // Admin notification email — sent on every accept or decline
    try {
      const { data: monRow } = await supabase
        .from('monitoring_settings')
        .select('alert_email')
        .eq('id', 1)
        .single()
      const adminEmail = monRow?.alert_email as string | null
      if (adminEmail) {
        await sendEmail({
          type: 'admin_notification',
          to: adminEmail,
          subject: `${musicianName} has ${availability === 'yes' ? 'accepted' : 'declined'} — ${formatDate(event.event_date as string | null)}${event.venue_name ? `, ${event.venue_name as string}` : ''}`,
          html: buildAdminNotificationEmail({
            musicianName,
            instrument: slot.instrument as string,
            fee: (slot.fee as number | null) ?? 0,
            response: availability,
            eventDate: event.event_date as string | null,
            venueName: event.venue_name as string | null,
            eventId: event.id as string,
            origin: req.nextUrl.origin,
          }),
        })
      }
    } catch (e) {
      console.error('admin notification error (non-fatal):', e)
    }

    // If declined: cascade to next musician (fire-and-forget)
    if (availability === 'no' && slot.cascade_enabled !== false) {
      try {
        await triggerCascade({ supabase, slot, currentMusicianId: invite.musician_id, origin: req.nextUrl.origin })
      } catch (e) {
        console.error('cascade error (non-fatal):', e)
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
