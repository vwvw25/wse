import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

// Maps Resend API status strings to our internal statuses
const STATUS_MAP: Record<string, string> = {
  sent:      'sent',
  delivered: 'delivered',
  bounced:   'bounced',
  complained: 'complained',
  failed:    'failed',
}

export async function POST() {
  const supabase = createServiceClient()
  const resend = getResend()

  // Fetch all email_logs stuck at 'sent' that have a resend_id to look up
  const { data: logs, error } = await supabase
    .from('email_logs')
    .select('id, resend_id, type')
    .eq('status', 'sent')
    .not('resend_id', 'is', null)
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!logs?.length) return NextResponse.json({ ok: true, updated: 0, checked: 0 })

  let updated = 0
  let failed = 0

  for (const log of logs) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (resend.emails as any).get(log.resend_id) as { data?: { last_event?: string }; error?: unknown }
      const resendStatus = result?.data?.last_event?.toLowerCase()
      const newStatus = resendStatus ? (STATUS_MAP[resendStatus] ?? null) : null

      if (!newStatus || newStatus === 'sent') continue // no change

      await supabase
        .from('email_logs')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', log.id)

      // Also update event_musicians invite/reminder status for delivered/failed/bounced
      if (newStatus === 'delivered' || newStatus === 'failed' || newStatus === 'bounced') {
        const slotStatus = newStatus === 'delivered' ? 'delivered' : 'failed'
        if (log.type === 'availability') {
          await supabase
            .from('event_musicians')
            .update({ invite_status: slotStatus })
            .eq('invite_email_log_id', log.id)
        } else if (log.type === 'availability_reminder') {
          await supabase
            .from('event_musicians')
            .update({ reminder_status: slotStatus })
            .eq('reminder_email_log_id', log.id)
        }
      }

      updated++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ ok: true, checked: logs.length, updated, failed })
}
