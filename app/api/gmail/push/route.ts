import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getGmailAccessToken, fetchEmailById, extractEmailText } from '@/lib/gmail'
import { buildAgentPrompt } from '@/lib/agent-prompt'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LABEL_OPTIONS = [
  'quote_request', 'confirmation_email', 'contract_chaser', 'contract',
  'booked_event_question', 'musician_invoice', 'client_invoice',
  'marketing', 'document_request', 'loading_info', 'repertoire_request',
]

const DEFAULT_PROMPT = `You are an assistant for a music entertainment agency called Ward Music Entertainment (WSE). Classify this incoming email.

From: {from}
Subject: {subject}
Body (first 1500 chars):
{body}

Respond with a JSON object only, no markdown:
{
  "labels": [array of applicable labels — can be multiple, can be empty],
  "is_issue": true or false,
  "priority": one of urgent | high | medium | low,
  "title": "action-oriented issue title: what needs to happen, who it involves, and the event/occasion if identifiable — do NOT use the email subject line, write something descriptive like 'Send musician list to Tiger at AOK for Rose Court ID set' or 'Chase contract signature from Marriott for June wedding'",
  "summary": "one sentence describing what this email is about and what needs to happen"
}

Labels — apply ALL that fit:
- quote_request: someone asking for a quote or enquiring about booking musicians
- confirmation_email: a client or agent confirming a booking
- contract_chaser: chasing for a signed contract
- contract: a signed contract has been sent or received
- booked_event_question: question about an already-booked event (logistics, timings, etc.)
- musician_invoice: a musician sending their invoice to WSE for payment
- client_invoice: WSE sending an invoice to a client
- marketing: a reply to WSE's own outreach — potential client or venue responding to something WSE sent
- document_request: a request for a document (insurance, contract, rider, etc.)
- loading_info: load-in/load-out or venue logistics information
- repertoire_request: a client or venue asking about a setlist/repertoire

is_issue — set to false for:
- Bank/payment platform notifications (SumUp, Stripe, etc.)
- Supplier spam or directory marketing not initiated by WSE
- Self-sent test emails
- Emails about events already fully resolved

Priority guide:
- urgent: needs action today (contract deadline, day-of issue, unpaid invoice overdue)
- high: needs action within 24h (new quote request, unanswered client question)
- medium: needs action this week (confirmation, general enquiry)
- low: informational, no immediate action needed`

// Haiku pricing (per million tokens)
const HAIKU_IN_PER_M = 0.80
const HAIKU_OUT_PER_M = 4.00

async function classifyEmail(from: string, subject: string, body: string, systemPrompt: string) {
  const prompt = systemPrompt
    .replace('{from}', from)
    .replace('{subject}', subject)
    .replace('{body}', body.slice(0, 1500))

  const start = Date.now()
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })
  const duration = Date.now() - start

  const tokensIn = message.usage.input_tokens
  const tokensOut = message.usage.output_tokens
  const costUsd = (tokensIn / 1_000_000) * HAIKU_IN_PER_M + (tokensOut / 1_000_000) * HAIKU_OUT_PER_M

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  let result: { labels: string[]; is_issue: boolean; priority: string; title: string; summary: string }
  try {
    result = JSON.parse(text)
  } catch {
    result = { labels: [], is_issue: true, priority: 'medium', title: subject || 'New email', summary: '' }
  }

  return { result, tokensIn, tokensOut, costUsd, duration }
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

    // Load CEO agent and build full prompt (instruction files + skills)
    const { data: ceoAgent } = await supabase
      .from('agents')
      .select('id, monthly_budget_usd, budget_alert_pct')
      .eq('slug', 'ceo')
      .single()

    const systemPrompt = ceoAgent
      ? await buildAgentPrompt(ceoAgent.id, DEFAULT_PROMPT)
      : DEFAULT_PROMPT

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

      // Classify using CEO agent prompt
      const { result: classification, tokensIn, tokensOut, costUsd, duration: durationMs } = await classifyEmail(
        from, subject, emailBody, systemPrompt
      )
      const isIssue = classification.is_issue !== false
      const labels = Array.isArray(classification.labels)
        ? classification.labels.filter((l: string) => LABEL_OPTIONS.includes(l))
        : []
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

      let issueId: string | null = null

      if (isIssue && inboxRow) {
        const { data: issue } = await supabase.from('issues').insert({
          title,
          description: `**From:** ${from}\n**Subject:** ${subject}\n\n${classification.summary}\n\n---\n${emailBody.slice(0, 2000)}`,
          status: 'triage',
          labels: labels.length ? labels : null,
          priority: classification.priority,
          source: 'email',
          gmail_inbox_id: inboxRow.id,
          agent_label: labels[0] ?? null,
          agent_priority: classification.priority,
          agent_title: title,
          agent_is_issue: true,
        }).select('id').single()
        issueId = issue?.id ?? null
      }

      // Log the run and check budget
      if (ceoAgent) {
        await supabase.from('agent_runs').insert({
          agent_id: ceoAgent.id,
          trigger: 'email',
          input_summary: `From: ${from} | Subject: ${subject}`,
          output_summary: `${labels.join(', ') || 'no label'} · ${classification.priority} · ${isIssue ? 'Created issue' : 'Not an issue'}`,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          cost_usd: costUsd,
          duration_ms: durationMs,
          model: 'claude-haiku-4-5-20251001',
          status: 'succeeded',
          transcript: `Labels: ${labels.join(', ') || 'none'}\nPriority: ${classification.priority}\nTitle: ${classification.title}\nSummary: ${classification.summary}`,
          issues_touched: issueId ? [issueId] : [],
        })

        // Budget alert check
        const monthStart = new Date()
        monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
        const { data: monthRuns } = await supabase
          .from('agent_runs')
          .select('cost_usd')
          .eq('agent_id', ceoAgent.id)
          .gte('created_at', monthStart.toISOString())

        const monthSpend = (monthRuns ?? []).reduce((s, r) => s + (r.cost_usd ?? 0), 0)
        const budget = ceoAgent.monthly_budget_usd ?? 15
        const alertPct = ceoAgent.budget_alert_pct ?? 80
        const pct = (monthSpend / budget) * 100

        if (pct >= alertPct && (pct - (costUsd / budget) * 100) < alertPct) {
          // Just crossed the threshold — fire a notification
          await supabase.from('notifications').insert({
            type: 'agent_budget_alert',
            title: `CEO agent at ${Math.round(pct)}% of monthly budget`,
            body: `$${monthSpend.toFixed(2)} of $${budget.toFixed(2)} used this month.`,
            read: false,
          })
        }
      }
    }
  } catch (err) {
    console.error('Gmail push error:', err)
  }

  return NextResponse.json({ ok: true })
}
