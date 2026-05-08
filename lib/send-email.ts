import { Resend } from 'resend'
import { createServiceClient } from './supabase'

// Lazy-init so the Resend constructor isn't called at module evaluation time
// (Next.js static page collection runs without env vars)
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export const FROM_ADDRESS = 'Ward Smith Entertainment <noreply@wardsmithmusic.co.uk>'

export type EmailType =
  | 'availability'
  | 'availability_reminder'
  | 'confirmation'
  | 'onboarding'
  | 'onboarding_reminder'
  | 'invoice'

export async function sendEmail({
  type,
  to,
  recipientName,
  subject,
  html,
  from = FROM_ADDRESS,
}: {
  type: EmailType
  to: string
  recipientName?: string
  subject: string
  html: string
  from?: string
}): Promise<{ ok: boolean; emailLogId: string }> {
  const supabase = createServiceClient()

  // Write pending row before attempting send, storing html for later viewing
  const { data: logRow } = await supabase
    .from('email_logs')
    .insert({
      type,
      recipient_email: to,
      recipient_name: recipientName ?? null,
      subject,
      status: 'pending',
      html,
    })
    .select('id')
    .single()

  const emailLogId = logRow?.id ?? ''

  try {
    const { data: monRow } = await supabase
      .from('monitoring_settings')
      .select('reply_to_email')
      .eq('id', 1)
      .single()
    const replyTo = monRow?.reply_to_email ?? undefined

    const result = await getResend().emails.send({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) })
    const resendId = (result.data as { id?: string } | null)?.id ?? null

    await supabase
      .from('email_logs')
      .update({ status: 'sent', resend_id: resendId, updated_at: new Date().toISOString() })
      .eq('id', emailLogId)

    return { ok: true, emailLogId }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    await supabase
      .from('email_logs')
      .update({ status: 'failed', error_message: errorMessage, updated_at: new Date().toISOString() })
      .eq('id', emailLogId)

    return { ok: false, emailLogId }
  }
}
