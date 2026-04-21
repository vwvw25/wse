import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/send-email'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wse.vercel.app'

function formatDeadline(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  })
}

function buildReminderEmailHtml({
  firstName,
  ctaUrl,
  deadlineAt,
  isSecondReminder,
}: {
  firstName: string
  ctaUrl: string
  deadlineAt: string
  isSecondReminder: boolean
}): string {
  const formattedDeadline = formatDeadline(deadlineAt)
  const urgency = isSecondReminder
    ? "This is an urgent reminder — your deadline is approaching very soon."
    : "Just a friendly reminder that we're still waiting for your details."

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">Reminder: details still needed</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">
        ${urgency}
      </p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:2px;">Please respond by</div>
        <div style="font-size:14px;color:#78350f;font-weight:500;">${formattedDeadline}</div>
      </div>
      <a href="${ctaUrl}" style="display:block;text-align:center;padding:14px 0;background:#111827;color:#fff;font-size:15px;font-weight:600;border-radius:6px;text-decoration:none;margin-bottom:24px;">
        Complete my details →
      </a>
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        If you have any questions, reply to this email and we'll be happy to help.
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  const { data: tokens, error } = await supabase
    .from('musician_onboarding_tokens')
    .select('*, musician:musicians(*)')
    .is('completed_at', null)
    .not('deadline_at', 'is', null)

  if (error) {
    console.error('onboarding-reminders fetch error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  let processed = 0

  for (const token of tokens ?? []) {
    const musician = token.musician as { first_name: string; email: string | null } | null
    if (!musician?.email) continue

    const created = new Date(token.created_at as string)
    const deadline = new Date(token.deadline_at as string)
    const totalMs = deadline.getTime() - created.getTime()
    if (totalMs <= 0) continue

    const elapsed = (now.getTime() - created.getTime()) / totalMs

    const ctaUrl = `${BASE_URL}/onboarding/${token.token as string}`

    // Reminder 2: 90% elapsed
    if (elapsed >= 0.9 && !token.reminder_2_sent_at) {
      try {
        await sendEmail({
          type: 'onboarding_reminder',
          to: musician.email,
          recipientName: musician.first_name,
          subject: 'URGENT: Ward Smith Entertainment — details still needed',
          html: buildReminderEmailHtml({
            firstName: musician.first_name,
            ctaUrl,
            deadlineAt: token.deadline_at as string,
            isSecondReminder: true,
          }),
        })
        await supabase
          .from('musician_onboarding_tokens')
          .update({ reminder_2_sent_at: now.toISOString() })
          .eq('id', token.id)
        processed++
      } catch (e) {
        console.error('reminder 2 send error for token', token.id, e)
      }
      continue // don't double-send
    }

    // Reminder 1: 50% elapsed
    if (elapsed >= 0.5 && !token.reminder_1_sent_at) {
      try {
        await sendEmail({
          type: 'onboarding_reminder',
          to: musician.email,
          recipientName: musician.first_name,
          subject: 'Reminder: Ward Smith Entertainment — details still needed',
          html: buildReminderEmailHtml({
            firstName: musician.first_name,
            ctaUrl,
            deadlineAt: token.deadline_at as string,
            isSecondReminder: false,
          }),
        })
        await supabase
          .from('musician_onboarding_tokens')
          .update({ reminder_1_sent_at: now.toISOString() })
          .eq('id', token.id)
        processed++
      } catch (e) {
        console.error('reminder 1 send error for token', token.id, e)
      }
    }
  }

  return NextResponse.json({ ok: true, processed })
}
