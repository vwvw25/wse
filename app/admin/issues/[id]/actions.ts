'use server'

import { createServiceClient } from '@/lib/supabase'

export type IssueMessage = {
  id: string
  issue_id: string
  role: 'agent' | 'user'
  content: string | null
  tool_calls: { name: string; input: Record<string, unknown>; output?: string; success?: boolean }[]
  created_at: string
}

export async function getIssueMessages(issueId: string): Promise<IssueMessage[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('issue_messages')
    .select('*')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true })
  return (data ?? []) as IssueMessage[]
}

export async function postIssueMessage(issueId: string, content: string) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('issue_messages').insert({
    issue_id: issueId,
    role: 'user',
    content: content.trim(),
  })
  if (error) throw new Error(error.message)
}
