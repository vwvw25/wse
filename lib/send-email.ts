import { Resend } from 'resend'
import { createServiceClient } from './supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_ADDRESS = 'Ward Smith Entertainment <onboarding@resend.dev>'

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

  // Write pending row before attempting send
  const { data: logRow } = await supabase
    .from('email_logs')
    .insert({
      type,
      recipient_email: to,
      recipient_name: recipientName ?? null,
      subject,
      status: 'pending',
    })
    .select('id')
    .single()

  const emailLogId = logRow?.id ?? ''

  try {
    const result = await resend.emails.send({ from, to, subject, html })
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
