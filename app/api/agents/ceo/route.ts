import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { buildAgentPrompt } from '@/lib/agent-prompt'
import Anthropic from '@anthropic-ai/sdk'
import { processInbox } from './tools/process-inbox'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SONNET_IN_PER_M = 3.00
const SONNET_OUT_PER_M = 15.00

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'process_inbox',
    description: 'Classify pending emails in the inbox and create triage issues from them.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'update_issue',
    description: 'Update the status, label, or priority of an issue.',
    input_schema: {
      type: 'object' as const,
      properties: {
        issue_id: { type: 'string', description: 'The issue ID' },
        status: { type: 'string', enum: ['triage', 'todo', 'in_progress', 'waiting', 'done', 'cancelled'] },
        label: { type: 'string' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
      },
      required: ['issue_id'],
    },
  },
  {
    name: 'create_proposal',
    description: 'Create a proposal in the Needs You queue for Victoria to review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        issue_id: { type: 'string', description: 'The related issue ID' },
        action_type: { type: 'string', enum: ['approval', 'question', 'manual_action'] },
        action_summary: { type: 'string', description: 'One clear sentence describing what is needed' },
        draft_content: { type: 'string', description: 'Full draft email or message, for approval type' },
        estimated_minutes: { type: 'number', description: 'For manual_action type only' },
      },
      required: ['issue_id', 'action_type', 'action_summary'],
    },
  },
  {
    name: 'post_message',
    description: 'Post a message in the issue chat.',
    input_schema: {
      type: 'object' as const,
      properties: {
        issue_id: { type: 'string', description: 'The issue ID to post on' },
        content: { type: 'string', description: 'Markdown message content' },
      },
      required: ['issue_id', 'content'],
    },
  },
]

async function executeTool(name: string, input: Record<string, unknown>) {
  const supabase = createServiceClient()

  if (name === 'process_inbox') {
    return await processInbox()
  }

  if (name === 'update_issue') {
    const { issue_id, ...fields } = input
    const { error } = await supabase.from('issues').update(fields).eq('id', issue_id)
    return error ? { error: error.message } : { ok: true }
  }

  if (name === 'create_proposal') {
    const { data, error } = await supabase.from('agent_proposals').insert({ ...input, status: 'pending' }).select('id').single()
    return error ? { error: error.message } : { ok: true, proposal_id: data.id }
  }

  if (name === 'post_message') {
    const { issue_id, content } = input
    const { error } = await supabase.from('issue_messages').insert({ issue_id, content, role: 'agent' })
    return error ? { error: error.message } : { ok: true }
  }

  return { error: `Unknown tool: ${name}` }
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()

  const { data: agent } = await supabase.from('agents').select('*').eq('slug', 'ceo').single()
  if (!agent) return NextResponse.json({ error: 'CEO agent not found' }, { status: 404 })

  const [{ data: triageIssues }, { data: openIssues }, { data: upcomingEvents }, { data: pendingEmails }] = await Promise.all([
    supabase.from('issues').select('id, title, label, priority, created_at').eq('status', 'triage').order('created_at', { ascending: false }).limit(20),
    supabase.from('issues').select('id, title, label, priority, status, created_at').in('status', ['todo', 'in_progress', 'waiting']).order('priority', { ascending: true }).limit(20),
    supabase.from('pm_events').select('id, name, start_date').gte('start_date', new Date().toISOString()).order('start_date', { ascending: true }).limit(10),
    supabase.from('gmail_inbox').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const context = `
## Current Date
${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

## Pending Emails (${(pendingEmails as unknown as { count: number })?.count ?? 0} unprocessed)

## Triage Queue (${triageIssues?.length ?? 0} items)
${triageIssues?.length ? triageIssues.map(i => `- [${i.id}] [${i.priority?.toUpperCase() ?? 'NO PRIORITY'}] ${i.title} (${i.label ?? 'unlabelled'})`).join('\n') : 'Queue is clear.'}

## Open Issues (${openIssues?.length ?? 0})
${openIssues?.length ? openIssues.map(i => `- [${i.id}] [${i.status}] ${i.title}`).join('\n') : 'No open issues.'}

## Upcoming Events (${upcomingEvents?.length ?? 0})
${upcomingEvents?.length ? upcomingEvents.map(e => `- ${e.name} — ${new Date(e.start_date).toLocaleDateString('en-GB')}`).join('\n') : 'No upcoming events.'}
`.trim()

  const systemPrompt = await buildAgentPrompt(agent.id, '')
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: context }]

  const start = Date.now()
  let tokensIn = 0
  let tokensOut = 0
  const issuesTouched: string[] = []

  // Tool loop — call Claude, execute any tool calls, feed results back, repeat
  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    })

    tokensIn += response.usage.input_tokens
    tokensOut += response.usage.output_tokens
    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const result = await executeTool(block.name, block.input as Record<string, unknown>)
        if (block.name === 'update_issue' && (block.input as any).issue_id) {
          issuesTouched.push((block.input as any).issue_id)
        }
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
      }

      messages.push({ role: 'user', content: toolResults })
      continue
    }

    break
  }

  const duration = Date.now() - start
  const costUsd = (tokensIn / 1_000_000) * SONNET_IN_PER_M + (tokensOut / 1_000_000) * SONNET_OUT_PER_M
  const lastMessage = messages[messages.length - 1]
  const outputText = lastMessage.role === 'assistant'
    ? (lastMessage.content as Anthropic.ContentBlock[]).filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('\n')
    : ''

  const { data: run } = await supabase.from('agent_runs').insert({
    agent_id: agent.id,
    trigger: 'manual',
    input_summary: `${triageIssues?.length ?? 0} triage, ${openIssues?.length ?? 0} open issues`,
    output_summary: outputText.slice(0, 200),
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd,
    duration_ms: duration,
    model: 'claude-sonnet-4-6',
    status: 'succeeded',
    transcript: outputText,
    issues_touched: issuesTouched,
  }).select('id').single()

  // Budget alert
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const { data: monthRuns } = await supabase.from('agent_runs').select('cost_usd').eq('agent_id', agent.id).gte('created_at', monthStart.toISOString())
  const monthSpend = (monthRuns ?? []).reduce((s, r) => s + (r.cost_usd ?? 0), 0)
  const budget = agent.monthly_budget_usd ?? 15
  const alertPct = agent.budget_alert_pct ?? 80
  const pct = (monthSpend / budget) * 100
  if (pct >= alertPct && (pct - (costUsd / budget) * 100) < alertPct) {
    await supabase.from('notifications').insert({
      type: 'agent_budget_alert',
      title: `CEO agent at ${Math.round(pct)}% of monthly budget`,
      body: `$${monthSpend.toFixed(2)} of $${budget.toFixed(2)} used this month.`,
      read: false,
    })
  }

  return NextResponse.json({ ok: true, runId: run?.id, output: outputText })
}
