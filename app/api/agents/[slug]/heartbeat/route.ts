import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { buildAgentPrompt } from '@/lib/agent-prompt'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SONNET_IN_PER_M = 3.00
const SONNET_OUT_PER_M = 15.00

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

  // Gather live WSE context
  const [
    { data: triageIssues },
    { data: openIssues },
    { data: upcomingEvents },
    { data: outstandingInvoices },
  ] = await Promise.all([
    supabase.from('issues').select('id, title, label, priority, created_at').eq('status', 'triage').order('created_at', { ascending: false }).limit(20),
    supabase.from('issues').select('id, title, label, priority, status, created_at').in('status', ['todo', 'in_progress']).order('priority', { ascending: true }).limit(20),
    supabase.from('events').select('id, name, date').gte('date', new Date().toISOString()).order('date', { ascending: true }).limit(10),
    supabase.from('invoices').select('id, number, status, total, due_date').in('status', ['sent', 'chased']).order('due_date', { ascending: true }).limit(10),
  ])

  const context = `
## Current Date
${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

## Triage Queue (${triageIssues?.length ?? 0} items awaiting review)
${triageIssues?.length ? triageIssues.map(i => `- [${i.priority?.toUpperCase() ?? 'NO PRIORITY'}] ${i.title} (${i.label ?? 'unlabelled'})`).join('\n') : 'Queue is clear.'}

## Open Issues (${openIssues?.length ?? 0})
${openIssues?.length ? openIssues.map(i => `- [${i.status}] ${i.title}`).join('\n') : 'No open issues.'}

## Upcoming Events (${upcomingEvents?.length ?? 0})
${upcomingEvents?.length ? upcomingEvents.map(e => `- ${e.name} — ${new Date(e.date).toLocaleDateString('en-GB')}`).join('\n') : 'No upcoming events.'}

## Outstanding Invoices (${outstandingInvoices?.length ?? 0})
${outstandingInvoices?.length ? outstandingInvoices.map(i => `- Invoice ${i.number} · £${i.total} · Due ${i.due_date ? new Date(i.due_date).toLocaleDateString('en-GB') : 'TBC'} · ${i.status}`).join('\n') : 'No outstanding invoices.'}

---

Based on the above, provide a concise CEO briefing:
1. What needs attention TODAY (prioritised list)
2. What can wait until this week
3. Any blockers or risks you want to flag
4. Any patterns in the triage queue worth noting

Be direct. Lead with the most important thing. No filler.
`.trim()

  const systemPrompt = await buildAgentPrompt(agent.id, `You are the CEO of Ward Music Entertainment (WSE), a music entertainment agency. Your job is to review what's happening in the business and tell Victoria (the board) what needs attention. Be direct, prioritised, and actionable.`)

  const start = Date.now()
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: context }],
  })
  const duration = Date.now() - start

  const tokensIn = message.usage.input_tokens
  const tokensOut = message.usage.output_tokens
  const costUsd = (tokensIn / 1_000_000) * SONNET_IN_PER_M + (tokensOut / 1_000_000) * SONNET_OUT_PER_M
  const output = message.content[0].type === 'text' ? message.content[0].text : ''

  // Log the run
  const { data: run } = await supabase.from('agent_runs').insert({
    agent_id: agent.id,
    trigger: 'heartbeat',
    input_summary: `Heartbeat — ${triageIssues?.length ?? 0} triage, ${openIssues?.length ?? 0} open issues`,
    output_summary: output.slice(0, 200),
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd,
    duration_ms: duration,
    model: 'claude-sonnet-4-6',
    status: 'succeeded',
    transcript: output,
    issues_touched: [],
  }).select('id').single()

  // Budget alert check
  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const { data: monthRuns } = await supabase
    .from('agent_runs')
    .select('cost_usd')
    .eq('agent_id', agent.id)
    .gte('created_at', monthStart.toISOString())

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

  return NextResponse.json({ ok: true, runId: run?.id, output })
}
