import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { triggerCascade } from '@/app/api/availability/respond/route'
import { getBaseUrl } from '@/lib/get-base-url'

/**
 * Cascade cron — checks for musician invites where the deadline has passed
 * with no response, marks them as deadline_expired, and cascades to the next
 * musician if cascade_enabled is true on the slot.
 *
 * Called by /api/cron/hourly — no direct cron entry needed.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = req.headers.get('x-cron-secret')
  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    cronSecret !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const origin = getBaseUrl(req)

  // Find all pending invites where deadline has passed
  // Pending = email_sent or reminder_sent, not yet responded
  const { data: pendingInvites, error } = await supabase
    .from('musician_invites')
    .select('*, slot:event_musicians(*)')
    .in('availability', ['email_sent', 'reminder_sent'])
    .not('email_sent_at', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const expired = (pendingInvites ?? []).filter(invite => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slot = invite.slot as any
    const deadlineHours = slot?.deadline_hours ?? invite.deadline_hours ?? 24
    const sentAt = new Date(invite.email_sent_at as string)
    const deadlineAt = new Date(sentAt.getTime() + deadlineHours * 60 * 60 * 1000)
    return now >= deadlineAt
  })

  if (expired.length === 0) {
    return NextResponse.json({ ok: true, expired: 0, cascaded: 0 })
  }

  let cascaded = 0

  for (const invite of expired) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slot = invite.slot as any

    // Mark invite as deadline_expired
    await supabase
      .from('musician_invites')
      .update({ availability: 'deadline_expired' })
      .eq('id', invite.id)

    // Update slot availability to tbc (clearing the stale 'tbc' isn't needed but make explicit)
    if (slot && slot.cascade_enabled !== false) {
      try {
        await triggerCascade({
          supabase,
          slot,
          currentMusicianId: invite.musician_id as string,
          origin,
        })
        cascaded++
      } catch (e) {
        console.error(`cascade failed for invite ${invite.id}:`, e)
      }
    }
  }

  return NextResponse.json({ ok: true, expired: expired.length, cascaded })
}
