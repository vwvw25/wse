import { createServiceClient } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { musicianFullName } from '@/types/musicians'
import { sendEmail } from '@/lib/send-email'

async function getSiteUrl(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-host')
  const host = forwarded ?? h.get('host') ?? ''
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
// Note: getSiteUrl() uses next/headers directly since this is a Server Component, not an API route

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t: string | null) { return t ?? '—' }

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
  eventLabel,
  eventDate,
  venueName,
  venueAddress,
  location,
  arrivalTime,
  startTime,
  finishTime,
  googleCalUrl,
  icalUrl,
}: {
  musicianName: string
  instrument: string
  eventLabel: string
  eventDate: string | null
  venueName: string | null
  venueAddress: string | null
  location: string | null
  arrivalTime: string | null
  startTime: string | null
  finishTime: string | null
  googleCalUrl: string
  icalUrl: string
}): string {
  const rows: [string, string][] = [
    ['Event', eventLabel],
    ['Date', formatDate(eventDate)],
    ...(venueName ? [['Venue', `${venueName}${location ? `, ${location}` : ''}`] as [string, string]] : []),
    ...(venueAddress ? [['Address', venueAddress] as [string, string]] : []),
    ...(arrivalTime ? [['Arrival', arrivalTime] as [string, string]] : []),
    ['Start / Finish', `${startTime ?? '—'} – ${finishTime ?? '—'}`],
    ['Your role', instrument],
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

export default async function AvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ response?: string; confirmed?: string; error?: string }>
}) {
  const { token } = await params
  const { response, confirmed, error } = await searchParams

  const supabase = createServiceClient()

  const [{ data: slot }, { data: gifs }] = await Promise.all([
    supabase
      .from('event_musicians')
      .select('*, musician:musicians(*), event:events(*)')
      .eq('token', token)
      .single(),
    supabase
      .from('celebration_gifs')
      .select('url'),
  ])

  if (!slot) notFound()

  const musician = slot.musician
  const event = slot.event
  const musicianName = musician ? musicianFullName(musician) : 'Musician'

  const eventLabel = event.agency_name
    ? (event.agent_name ? `${event.agent_name} at ${event.agency_name}` : event.agency_name)
    : (event.agent_name ?? 'Event')

  const gifUrls = (gifs ?? []).map((g: { url: string }) => g.url)
  const randomGif = gifUrls.length > 0
    ? gifUrls[Math.floor(Math.random() * gifUrls.length)]
    : null

  // Handle response submission via URL param — server-side
  if (response === 'yes' || response === 'no') {
    const availability = response === 'yes' ? 'yes' : 'no'
    const now = new Date().toISOString()

    // Always stamp link_clicked_at so we have a record even if something goes wrong below
    await supabase
      .from('event_musicians')
      .update({ link_clicked_at: now })
      .eq('token', token)

    const pendingStates = ['tbc', 'email_sent', 'reminder_sent']
    if (pendingStates.includes(slot.availability)) {
      try {
        const emailStatus = availability === 'yes' ? 'accepted' : 'declined'
        const statusUpdate = slot.reminder_sent_at
          ? { reminder_status: emailStatus }
          : { invite_status: emailStatus }

        const { error: updateError } = await supabase
          .from('event_musicians')
          .update({ availability, ...statusUpdate })
          .eq('token', token)

        if (updateError) throw new Error(`DB update failed: ${updateError.message}`)

        // If declined and preference order exists, contact next musician
        if (availability === 'no') {
          const { data: prefOrder } = await supabase
            .from('preference_orders')
            .select('*, musician:musicians(*)')
            .eq('instrument', slot.instrument)
            .order('rank')

          if (prefOrder && prefOrder.length > 0) {
            const currentIdx = prefOrder.findIndex((p: { musician_id: string }) => p.musician_id === slot.musician_id)
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
                const nextBaseUrl = await getSiteUrl()
                fetch(`${nextBaseUrl}/api/musicians/send-availability`, {
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
            const gcTitle = encodeURIComponent(`WSE — ${eventLabel}`)
            const gcLocation = encodeURIComponent([event.venue_name, event.venue_address ?? event.location].filter(Boolean).join(', '))
            const gcDetails = encodeURIComponent(`Your role: ${slot.instrument}`)
            const googleCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${gcTitle}&dates=${gcStart}/${gcEnd}&location=${gcLocation}&details=${gcDetails}`
            const siteUrl = await getSiteUrl()
            const icalUrl = `${siteUrl}/api/ical/${token}`

            await sendEmail({
              type: 'confirmation',
              to: musician.email as string,
              recipientName: musicianName,
              subject: `Gig confirmed — ${formatDate(event.event_date as string | null)}`,
              html: buildConfirmationEmail({
                musicianName,
                instrument: slot.instrument as string,
                eventLabel,
                eventDate: event.event_date as string | null,
                venueName: event.venue_name as string | null,
                venueAddress: event.venue_address as string | null,
                location: event.location as string | null,
                arrivalTime: event.arrival_time as string | null,
                startTime: event.start_time as string | null,
                finishTime: event.finish_time as string | null,
                googleCalUrl,
                icalUrl,
              }),
            })
          } catch (e) {
            console.error('confirmation email error:', e)
          }
        }
      } catch (err) {
        // Something went wrong recording the response — alert admin immediately
        console.error('availability response processing error:', err)
        const errMsg = err instanceof Error ? err.message : String(err)
        try {
          await supabase.from('notifications').insert({
            type: 'response_failed',
            message: `⚠️ ${musicianName} (${slot.instrument}) clicked ${availability.toUpperCase()} but their response FAILED to record. Error: ${errMsg}. Token: ${token}`,
            link: `/admin/events/${slot.event_id}/musicians`,
          })
        } catch { /* best-effort */ }
        // Show the musician an error page rather than a false success
        redirect(`/availability/${token}?error=1`)
      }
    }

    redirect(`/availability/${token}?confirmed=${availability}`)
  }

  const alreadyResponded = slot.availability !== 'tbc'
  const responseWas = confirmed ?? (alreadyResponded ? slot.availability : null)

  // ── Shared card layout for all states ───────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: '#111827', padding: '24px 28px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Ward Smith Entertainment
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
            Availability request
          </div>
        </div>

        <div style={{ padding: '24px 28px' }}>

          {/* 'Yes' confirmation banner + GIF */}
          {responseWas === 'yes' && (
            <>
              <div style={{
                padding: '14px 16px', borderRadius: 6, marginBottom: 20,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                color: '#14532d', fontSize: 14, fontWeight: 500,
              }}>
                ✓ You&apos;re booked in! A confirmation email with a calendar invite is on its way to you.
              </div>
              {randomGif ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={randomGif}
                  alt="Celebration"
                  style={{ width: '100%', borderRadius: 6, display: 'block', marginBottom: 20 }}
                />
              ) : (
                <div style={{ textAlign: 'center', fontSize: 48, marginBottom: 20 }}>🎉</div>
              )}
            </>
          )}

          {/* 'No' confirmation banner */}
          {responseWas === 'no' && (
            <div style={{
              padding: '14px 16px', borderRadius: 6, marginBottom: 20,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#991b1b', fontSize: 14, fontWeight: 500,
            }}>
              ✗ You&apos;ve indicated you&apos;re not available. We&apos;ll be in touch if anything changes.
            </div>
          )}

          {/* Error banner */}
          {error === '1' && (
            <div style={{
              padding: '14px 16px', borderRadius: 6, marginBottom: 20,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#991b1b', fontSize: 14,
            }}>
              <strong>Something went wrong recording your response.</strong>
              <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                Please reply to the original email or contact us directly so we can confirm your availability manually.
                We apologise for the inconvenience.
              </p>
            </div>
          )}

          <p style={{ fontSize: 14, color: '#374151', margin: '0 0 20px' }}>
            Hi <strong>{musicianName}</strong>,{!responseWas ? ' please confirm your availability for the following event.' : ''}
          </p>

          {/* Event details */}
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '16px 20px', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {[
                ['Event', eventLabel],
                ['Date', formatDate(event.event_date)],
                event.venue_name ? ['Venue', `${event.venue_name}${event.location ? `, ${event.location}` : ''}`] : null,
                event.venue_address ? ['Address', event.venue_address] : null,
                ['Arrival', formatTime(event.arrival_time)],
                ['Start / Finish', `${formatTime(event.start_time)} – ${formatTime(event.finish_time)}`],
                ['Your role', slot.instrument],
              ].filter((r): r is [string, string] => r !== null).map(([label, value], i) => (
                <tr key={i}>
                  <td style={{ padding: '5px 0', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 110, verticalAlign: 'top' }}>
                    {label}
                  </td>
                  <td style={{ padding: '5px 0', fontSize: 13, color: '#111827', fontWeight: label === 'Your role' ? 600 : 400 }}>
                    {value}
                  </td>
                </tr>
              ))}
            </table>
          </div>

          {/* Response buttons — only if not yet responded */}
          {!responseWas && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <a
                href={`/availability/${token}?response=yes`}
                style={{ display: 'block', textAlign: 'center', padding: '13px 0', background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 6, textDecoration: 'none' }}
              >
                ✓ Yes, I&apos;m available
              </a>
              <a
                href={`/availability/${token}?response=no`}
                style={{ display: 'block', textAlign: 'center', padding: '13px 0', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 6, textDecoration: 'none' }}
              >
                ✗ Not available
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
