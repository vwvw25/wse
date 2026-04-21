import { createServiceClient } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import { musicianFullName } from '@/types/musicians'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t: string | null) { return t ?? '—' }

export default async function AvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ response?: string; confirmed?: string }>
}) {
  const { token } = await params
  const { response, confirmed } = await searchParams

  const supabase = createServiceClient()

  const { data: slot } = await supabase
    .from('event_musicians')
    .select('*, musician:musicians(*), event:events(*)')
    .eq('token', token)
    .single()

  if (!slot) notFound()

  const musician = slot.musician
  const event = slot.event
  const musicianName = musician ? musicianFullName(musician) : 'Musician'

  const eventLabel = event.agency_name
    ? (event.agent_name ? `${event.agent_name} at ${event.agency_name}` : event.agency_name)
    : (event.agent_name ?? 'Event')

  // Handle response submission via URL param — server-side
  if (response === 'yes' || response === 'no') {
    const availability = response === 'yes' ? 'yes' : 'no'

    // Only update if not already responded (tbc, email_sent, reminder_sent are all pending states)
    const pendingStates = ['tbc', 'email_sent', 'reminder_sent']
    if (pendingStates.includes(slot.availability)) {
      await supabase
        .from('event_musicians')
        .update({ availability })
        .eq('token', token)

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
            // Create a new slot for the next musician
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
              // Fire send-availability email for the new slot
              const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wse.vercel.app'
              fetch(`${baseUrl}/api/musicians/send-availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slotId: newSlot.id }),
              }).catch(() => {}) // fire and forget
            }
          }
        }
      }
    }

    redirect(`/availability/${token}?confirmed=${availability}`)
  }

  const alreadyResponded = slot.availability !== 'tbc'
  const responseWas = confirmed ?? (alreadyResponded ? slot.availability : null)

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

          {/* Confirmation state */}
          {responseWas && (
            <div style={{
              padding: '14px 16px', borderRadius: 6, marginBottom: 20,
              background: responseWas === 'yes' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${responseWas === 'yes' ? '#bbf7d0' : '#fecaca'}`,
              color: responseWas === 'yes' ? '#166534' : '#991b1b',
              fontSize: 14, fontWeight: 500,
            }}>
              {responseWas === 'yes'
                ? '✓ You\'ve confirmed you\'re available for this event.'
                : '✗ You\'ve indicated you\'re not available. We\'ll be in touch if anything changes.'}
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
                ✓ Yes, I'm available
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
