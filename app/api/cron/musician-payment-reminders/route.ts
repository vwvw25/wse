import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/send-email'

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmt(n: number) {
  return `£${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function eventLabel(ev: { agency_name: string | null; agent_name: string | null; event_date: string | null } | null): string {
  if (!ev) return 'unknown event'
  const name = ev.agency_name
    ? ev.agent_name ? `${ev.agent_name} / ${ev.agency_name}` : ev.agency_name
    : (ev.agent_name ?? null)
  return name ? `${name} (${formatDate(ev.event_date)})` : formatDate(ev.event_date)
}

function buildReminderHtml({
  musicianName,
  instrument,
  fee,
  dueDate,
  eventLabel: evLabel,
  timing,
}: {
  musicianName: string
  instrument: string
  fee: number
  dueDate: string
  eventLabel: string
  timing: 'today' | 'tomorrow'
}): string {
  const urgency = timing === 'today'
    ? 'Payment is <strong>due today</strong>.'
    : 'Payment is due <strong>tomorrow</strong>.'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">Musician payment reminder</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;font-size:15px;color:#111827;line-height:1.5;">${urgency}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Musician</td><td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;border-bottom:1px solid #f3f4f6;">${musicianName}</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Instrument</td><td style="padding:8px 0;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">${instrument}</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Event</td><td style="padding:8px 0;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">${evLabel}</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Fee</td><td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;border-bottom:1px solid #f3f4f6;">${fmt(fee)}</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#6b7280;">Due date</td><td style="padding:8px 0;font-size:13px;color:#111827;">${formatDate(dueDate)}</td></tr>
      </table>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/admin/musician-invoices" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">View musician invoices →</a>
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

  // Get account owner email
  const { data: invSettings } = await supabase
    .from('invoice_settings')
    .select('account_owner_email')
    .single()

  const ownerEmail = invSettings?.account_owner_email as string | null
  if (!ownerEmail) {
    return NextResponse.json({ ok: true, skipped: 'No account owner email configured' })
  }

  const today = toDateStr(new Date())
  const tomorrow = toDateStr(new Date(Date.now() + 86400000))

  // Fetch slots where due date is today or tomorrow, payment not yet made
  const { data: slots } = await supabase
    .from('event_musicians')
    .select(`
      id, instrument, fee,
      musician_invoice_due_date, musician_payment_date,
      event:events(id, event_date, agency_name, agent_name),
      musician:musicians(id, first_name, last_name)
    `)
    .in('musician_invoice_due_date', [today, tomorrow])
    .is('musician_payment_date', null)
    .not('musician_id', 'is', null)

  if (!slots || slots.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let sent = 0
  const errors: string[] = []

  for (const slot of slots) {
    const musician = slot.musician as unknown as { first_name: string; last_name: string } | null
    const event = slot.event as unknown as { id: string; event_date: string | null; agency_name: string | null; agent_name: string | null } | null
    if (!musician) continue

    const musicianName = `${musician.first_name} ${musician.last_name}`
    const evLabel = eventLabel(event)
    const timing = slot.musician_invoice_due_date === today ? 'today' : 'tomorrow'
    const subject = `Payment due to ${musicianName} for ${evLabel} ${timing}`

    try {
      await sendEmail({
        type: 'musician_payment_reminder',
        to: ownerEmail,
        subject,
        html: buildReminderHtml({
          musicianName,
          instrument: slot.instrument,
          fee: slot.fee,
          dueDate: slot.musician_invoice_due_date,
          eventLabel: evLabel,
          timing,
        }),
      })
      sent++
    } catch (err) {
      errors.push(`${musicianName}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ ok: true, sent, errors: errors.length ? errors : undefined })
}
