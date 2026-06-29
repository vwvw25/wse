import { createServiceClient } from '@/lib/supabase'
import NeedsYouClient from './NeedsYouClient'

export default async function NeedsYouPage() {
  const supabase = createServiceClient()

  const { data: proposals, error } = await supabase
    .from('agent_proposals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) console.error('agent_proposals fetch error:', error)

  // Fetch related issues separately
  const issueIds = [...new Set((proposals ?? []).map(p => p.issue_id).filter(Boolean))]
  const { data: issues } = issueIds.length > 0
    ? await supabase
        .from('issues')
        .select('id, number, title, status, priority, labels, pm_event_id, pm_events(id, name, date)')
        .in('id', issueIds)
    : { data: [] }

  const issueMap = Object.fromEntries((issues ?? []).map(i => [i.id, i]))

  const enriched = (proposals ?? []).map(p => ({
    ...p,
    issues: p.issue_id ? issueMap[p.issue_id] ?? null : null,
  }))

  return <NeedsYouClient proposals={enriched} />
}
