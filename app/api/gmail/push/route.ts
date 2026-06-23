import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getGmailAccessToken, fetchEmailById, extractEmailText } from '@/lib/gmail'
import { getBaseUrl } from '@/lib/get-base-url'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Pub/Sub sends a base64-encoded message
  const data = body?.message?.data
  if (!data) return NextResponse.json({ ok: true })

  const decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'))
  const historyId = decoded.historyId
  if (!historyId) return NextResponse.json({ ok: true })

  try {
    const accessToken = await getGmailAccessToken()
    const supabase = createServiceClient()

    // Get the last known historyId so we only fetch new messages
    const { data: state } = await supabase
      .from('gmail_tokens')
      .select('last_history_id')
      .eq('email', 'wardvmusic@gmail.com')
      .single()

    const startHistoryId = state?.last_history_id ?? historyId

    // Fetch history since last known point
    const histRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const history = await histRes.json()

    // Update the stored historyId
    await supabase
      .from('gmail_tokens')
      .update({ last_history_id: historyId })
      .eq('email', 'wardvmusic@gmail.com')

    const messages = history.history?.flatMap((h: any) => h.messagesAdded ?? []) ?? []

    let newEmailCount = 0
    for (const { message } of messages) {
      const full = await fetchEmailById(message.id, accessToken)

      // Skip sent mail
      const labelIds: string[] = full.labelIds ?? []
      if (labelIds.includes('SENT')) continue

      const { subject, from, body: emailBody } = extractEmailText(full)

      const { error } = await supabase.from('gmail_inbox').insert({
        gmail_message_id: message.id,
        from_address: from,
        subject,
        body: emailBody,
        status: 'pending',
      })
      if (!error) newEmailCount++
    }

    // Trigger classification immediately if we stored new emails
    if (newEmailCount > 0) {
      const baseUrl = getBaseUrl(req)
      await fetch(`${baseUrl}/api/cron/process-inbox`, {
        method: 'POST',
        headers: { 'x-internal': '1' },
      }).catch(() => {
        // Non-critical — daily cron will catch any that fail
      })
    }
  } catch (err) {
    console.error('Gmail push error:', err)
  }

  // Always return 200 to acknowledge the Pub/Sub message
  return NextResponse.json({ ok: true })
}
