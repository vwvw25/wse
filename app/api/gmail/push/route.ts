import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getGmailAccessToken, fetchEmailById, extractEmailText } from '@/lib/gmail'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LABEL_OPTIONS = [
  'quote_request',
  'confirmation_email',
  'contract_chaser',
  'contract',
  'booked_event_question',
  'musician_invoice',
  'other',
]

async function classifyEmail(from: string, subject: string, body: string) {
  const prompt = `You are an assistant for a music entertainment agency called Ward Music Entertainment (WSE). Classify this incoming email.

From: ${from}
Subject: ${subject}
Body (first 1500 chars):
${body.slice(0, 1500)}

Respond with a JSON object only, no markdown:
{
  "label": one of ${LABEL_OPTIONS.join(' | ')},
  "priority": one of urgent | high | medium | low,
  "title": "short 5-10 word issue title summarising what action is needed",
  "summary": "one sentence describing what this email is about and what needs to happen"
}

Label guide:
- quote_request: someone asking for a quote or enquiring about booking musicians
- confirmation_email: client or venue confirming booking details
- contract_chaser: chasing for a signed contract
- contract: a signed contract has been sent/received
- booked_event_question: question about an already-booked event (logistics, timings, etc)
- musician_invoice: a musician sending their invoice for payment
- other: anything else (general queries, marketing, spam, etc)

Priority guide:
- urgent: needs action today (contract deadline, day-of issue, unpaid invoice overdue)
- high: needs action within 24h (new quote request, unanswered client question)
- medium: needs action this week (confirmation, general enquiry)
- low: informational, no immediate action needed`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  try {
    return JSON.parse(text) as { label: string; priority: string; title: string; summary: string }
  } catch {
    return { label: 'other', priority: 'medium', title: subject || 'New email', summary: '' }
  }
}

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

      // Skip sent mail and drafts
      const labelIds: string[] = full.labelIds ?? []
      if (labelIds.includes('SENT') || labelIds.includes('DRAFT')) continue

      const { subject, from, body: emailBody } = extractEmailText(full)

      // Classify immediately inline
      const classification = await classifyEmail(from, subject, emailBody)
      const isIssue = classification.label !== 'other'
      const title = classification.title || subject || 'New email'

      // Store inbox record
      const { data: inboxRow } = await supabase.from('gmail_inbox').insert({
        gmail_message_id: message.id,
        from_address: from,
        subject,
        body: emailBody,
        status: 'done',
        agent_decision: isIssue ? 'triage' : 'not_an_issue',
      }).select('id').single()

      if (isIssue && inboxRow) {
        await supabase.from('issues').insert({
          title,
          description: `**From:** ${from}\n**Subject:** ${subject}\n\n${classification.summary}\n\n---\n${emailBody.slice(0, 2000)}`,
          status: 'triage',
          label: classification.label,
          priority: classification.priority,
          source: 'email',
          gmail_inbox_id: inboxRow.id,
          agent_label: classification.label,
          agent_priority: classification.priority,
          agent_title: title,
          agent_is_issue: true,
        })
      }
    }
  } catch (err) {
    console.error('Gmail push error:', err)
  }

  // Always return 200 to acknowledge the Pub/Sub message
  return NextResponse.json({ ok: true })
}
