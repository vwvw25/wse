import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }
const FROM_ADDRESS = 'Ward Smith Entertainment <onboarding@resend.dev>'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  // Fetch monitoring settings
  const { data: settings } = await supabase.from('monitoring_settings').select('*').eq('id', 1).single()
  const alertEmail = settings?.alert_email as string | null
  const deliveryThreshold = (settings?.delivery_threshold_minutes as number | null) ?? 30
  const pendingThreshold = (settings?.pending_threshold_minutes as number | null) ?? 5

  // Find stuck emails
  const deliveryCutoff = new Date(now.getTime() - deliveryThreshold * 60 * 1000).toISOString()
  const pendingCutoff = new Date(now.getTime() - pendingThreshold * 60 * 1000).toISOString()

  const { data: stuckEmails } = await supabase
    .from('email_logs')
    .select('*')
    .is('alerted_at', null)
    .or(`and(status.eq.sent,created_at.lt.${deliveryCutoff}),and(status.eq.pending,created_at.lt.${pendingCutoff})`)

  if (!stuckEmails || stuckEmails.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  let processed = 0

  for (const email of stuckEmails) {
    const reason = email.status === 'pending'
      ? `never reached the email provider (stuck as pending for >${pendingThreshold} min — possible SaaS bug)`
      : `not delivered after ${deliveryThreshold} minutes`

    const message = `Email to ${(email.recipient_name as string | null) ?? email.recipient_email as string} (${email.type as string}) ${reason}: "${email.subject as string}"`

    // Create notification
    await supabase.from('notifications').insert({
      type: 'email_undelivered',
      message,
      link: '/admin/email-logs',
    })

    // Send alert email to admin if configured
    if (alertEmail) {
      try {
        await getResend().emails.send({
          from: FROM_ADDRESS,
          to: alertEmail,
          subject: `⚠️ Email delivery issue — ${email.type as string}`,
          html: `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;">
            <h2 style="color:#111827;">Email delivery issue</h2>
            <p style="color:#374151;">${message}</p>
            <p style="color:#6b7280;font-size:13px;">Sent at: ${new Date(email.created_at as string).toLocaleString('en-GB')}</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wse.vercel.app'}/admin/email-logs" style="display:inline-block;margin-top:16px;padding:10px 18px;background:#111827;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">
              View email logs →
            </a>
          </body></html>`,
        })
      } catch (e) {
        console.error('Failed to send health alert email:', e)
      }
    }

    // Mark as alerted
    await supabase
      .from('email_logs')
      .update({ alerted_at: now.toISOString(), updated_at: now.toISOString() })
      .eq('id', email.id)

    processed++
  }

  return NextResponse.json({ ok: true, processed })
}
