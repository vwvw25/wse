import { createServiceClient } from '@/lib/supabase'
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

type Classification = {
  label: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  title: string
  summary: string
}

async function classifyEmail(from: string, subject: string, body: string): Promise<Classification> {
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
    return JSON.parse(text)
  } catch {
    return { label: 'other', priority: 'medium', title: subject || 'New email', summary: '' }
  }
}

export type ProcessInboxResult = {
  processed: number
  results: { id: string; title: string; label: string }[]
}

export async function processInbox(): Promise<ProcessInboxResult> {
  const supabase = createServiceClient()

  const { data: emails, error } = await supabase
    .from('gmail_inbox')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5)

  if (error || !emails?.length) return { processed: 0, results: [] }

  let processed = 0
  const results: { id: string; title: string; label: string }[] = []

  for (const email of emails) {
    try {
      await supabase.from('gmail_inbox').update({ status: 'processing' }).eq('id', email.id)

      const classification = await classifyEmail(
        email.from_address ?? '',
        email.subject ?? '',
        email.body ?? ''
      )

      const title = classification.title || email.subject || 'New email'
      const isIssue = classification.label !== 'other'
      const agentDecision = isIssue ? 'triage' : 'not_an_issue'
      const finalLabel = isIssue ? classification.label : null

      let issueId: string | null = null

      if (isIssue) {
        const { data: issue } = await supabase
          .from('issues')
          .insert({
            title,
            description: `**From:** ${email.from_address}\n**Subject:** ${email.subject}\n\n${classification.summary}\n\n---\n${email.body?.slice(0, 2000) ?? ''}`,
            status: 'triage',
            label: finalLabel,
            priority: classification.priority,
            source: 'email',
            gmail_inbox_id: email.id,
            agent_label: classification.label,
            agent_priority: classification.priority,
            agent_title: title,
            agent_is_issue: true,
          })
          .select('id')
          .single()
        issueId = issue?.id ?? null
      }

      await supabase
        .from('gmail_inbox')
        .update({ status: 'done', agent_decision: agentDecision, issue_id: issueId })
        .eq('id', email.id)

      processed++
      results.push({ id: email.id, title, label: classification.label })
    } catch (err) {
      console.error('Failed to process email', email.id, err)
      await supabase.from('gmail_inbox').update({ status: 'pending' }).eq('id', email.id)
    }
  }

  return { processed, results }
}
