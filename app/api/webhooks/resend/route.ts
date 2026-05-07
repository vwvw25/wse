import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const body = await req.json() as {
    type: string
    data: { email_id: string; to: string[]; subject?: string }
  }

  const { type, data } = body
  const resendId = data?.email_id

  if (!resendId) return NextResponse.json({ ok: true })

  const statusMap: Record<string, string> = {
    'email.delivered': 'delivered',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.failed': 'failed',
    'email.delivery_delayed': 'sent', // stays as sent, will be caught by health cron
  }

  const newStatus = statusMap[type]
  if (!newStatus) return NextResponse.json({ ok: true })

  // Update email_logs by resend_id
  const { data: logRow } = await supabase
    .from('email_logs')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('resend_id', resendId)
    .select('id, recipient_email, recipient_name, subject, type')
    .single()

  // Propagate failure to musician invite/reminder status
  if ((newStatus === 'bounced' || newStatus === 'failed') && logRow) {
    if (logRow.type === 'availability') {
      await supabase
        .from('event_musicians')
        .update({ invite_status: 'failed' })
        .eq('invite_email_log_id', logRow.id)
    } else if (logRow.type === 'availability_reminder') {
      await supabase
        .from('event_musicians')
        .update({ reminder_status: 'failed' })
        .eq('reminder_email_log_id', logRow.id)
    }
  }

  // Create notification for bounced, complained, or failed
  if ((newStatus === 'bounced' || newStatus === 'complained' || newStatus === 'failed') && logRow) {
    const label = newStatus === 'bounced' ? 'bounced' : newStatus === 'complained' ? 'marked as spam' : 'failed'
    await supabase.from('notifications').insert({
      type: `email_${newStatus}`,
      message: `Email to ${logRow.recipient_name ?? logRow.recipient_email} (${logRow.type}) ${label}: "${logRow.subject}"`,
      link: `/admin/email-logs`,
    })
  }

  return NextResponse.json({ ok: true })
}
