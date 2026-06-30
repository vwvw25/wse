import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getGmailAccessToken, fetchEmailById, extractEmailText } from '@/lib/gmail'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const data = body?.message?.data
  if (!data) return NextResponse.json({ ok: true })

  const decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'))
  const historyId = decoded.historyId
  if (!historyId) return NextResponse.json({ ok: true })

  try {
    const accessToken = await getGmailAccessToken()
    const supabase = createServiceClient()

    const { data: state } = await supabase
      .from('gmail_tokens')
      .select('last_history_id')
      .eq('email', 'wardvmusic@gmail.com')
      .single()

    const startHistoryId = state?.last_history_id ?? historyId

    const histRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const history = await histRes.json()

    await supabase
      .from('gmail_tokens')
      .update({ last_history_id: historyId })
      .eq('email', 'wardvmusic@gmail.com')

    const messages = history.history?.flatMap((h: any) => h.messagesAdded ?? []) ?? []

    for (const { message } of messages) {
      const full = await fetchEmailById(message.id, accessToken)

      const labelIds: string[] = full.labelIds ?? []
      if (labelIds.includes('SENT') || labelIds.includes('DRAFT')) continue

      const { subject, from, body: emailBody } = extractEmailText(full)

      // Store the raw email — CEO will classify it on next heartbeat
      const { data: inboxRow } = await supabase.from('gmail_inbox').insert({
        gmail_message_id: message.id,
        from_address: from,
        subject,
        body: emailBody,
        status: 'pending',
      }).select('id').single()

      if (inboxRow) {
        // Create a bare triage issue — title is raw subject, CEO will rewrite it
        await supabase.from('issues').insert({
          title: subject || '(no subject)',
          description: `**From:** ${from}\n**Subject:** ${subject}\n\n---\n${emailBody.slice(0, 2000)}`,
          status: 'triage',
          source: 'email',
          gmail_inbox_id: inboxRow.id,
        })

        await supabase
          .from('gmail_inbox')
          .update({ status: 'done' })
          .eq('id', inboxRow.id)
      }
    }
  } catch (err) {
    console.error('Gmail push error:', err)
  }

  return NextResponse.json({ ok: true })
}
