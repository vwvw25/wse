'use server'

import { createServiceClient } from '@/lib/supabase'

// Accept a triage issue — moves to todo, logs eval
export async function acceptTriageIssue(issueId: string) {
  const supabase = createServiceClient()

  // Fetch current issue state (final decisions)
  const { data: issue } = await supabase
    .from('issues')
    .select('*')
    .eq('id', issueId)
    .single()

  if (!issue) throw new Error('Issue not found')

  // Write eval record
  await supabase.from('triage_evals').insert({
    gmail_inbox_id: issue.gmail_inbox_id ?? null,
    issue_id: issueId,
    agent_is_issue: issue.agent_is_issue ?? true,
    agent_label: issue.agent_label ?? null,
    agent_priority: issue.agent_priority ?? null,
    agent_title: issue.agent_title ?? null,
    final_is_issue: true,
    final_label: issue.label ?? null,
    final_priority: issue.priority ?? null,
    final_title: issue.title,
  })

  // Move issue out of triage
  await supabase
    .from('issues')
    .update({ status: 'todo' })
    .eq('id', issueId)
}

// Move a triage issue to not-an-issue
export async function moveToNotAnIssue(issueId: string) {
  const supabase = createServiceClient()

  const { data: issue } = await supabase
    .from('issues')
    .select('*')
    .eq('id', issueId)
    .single()

  if (!issue) throw new Error('Issue not found')

  // Log the correction — agent thought it was an issue, human disagrees
  await supabase.from('triage_evals').insert({
    gmail_inbox_id: issue.gmail_inbox_id ?? null,
    issue_id: issueId,
    agent_is_issue: issue.agent_is_issue ?? true,
    agent_label: issue.agent_label ?? null,
    agent_priority: issue.agent_priority ?? null,
    agent_title: issue.agent_title ?? null,
    final_is_issue: false,
    final_label: issue.label ?? null,
    final_priority: issue.priority ?? null,
    final_title: issue.title,
  })

  // Update gmail_inbox agent_decision to reflect human override
  if (issue.gmail_inbox_id) {
    await supabase
      .from('gmail_inbox')
      .update({ agent_decision: 'not_an_issue_human' })
      .eq('id', issue.gmail_inbox_id)
  }

  // Delete the issue (it shouldn't be in issues table)
  await supabase.from('issues').delete().eq('id', issueId)
}

// Promote a not-an-issue inbox item to triage (human override)
export async function promoteToTriage(gmailInboxId: string) {
  const supabase = createServiceClient()

  const { data: email } = await supabase
    .from('gmail_inbox')
    .select('*')
    .eq('id', gmailInboxId)
    .single()

  if (!email) throw new Error('Inbox item not found')

  // Create a triage issue
  const { data: issue } = await supabase
    .from('issues')
    .insert({
      title: email.subject ?? 'Email from inbox',
      description: `**From:** ${email.from_address}\n**Subject:** ${email.subject}\n\n---\n${email.body?.slice(0, 2000) ?? ''}`,
      status: 'triage',
      source: 'email',
      gmail_inbox_id: gmailInboxId,
      agent_is_issue: false,
      agent_label: null,
      agent_priority: null,
      agent_title: email.subject ?? null,
    })
    .select('id')
    .single()

  // Log the correction — agent said not an issue, human disagrees
  await supabase.from('triage_evals').insert({
    gmail_inbox_id: gmailInboxId,
    issue_id: issue?.id ?? null,
    agent_is_issue: false,
    agent_label: null,
    agent_priority: null,
    agent_title: email.subject ?? null,
    final_is_issue: true,
    final_label: null,
    final_priority: null,
    final_title: email.subject ?? null,
  })

  await supabase
    .from('gmail_inbox')
    .update({ agent_decision: 'triage_human', issue_id: issue?.id ?? null })
    .eq('id', gmailInboxId)
}
