import { createServiceClient } from '@/lib/supabase'
import NotAnIssueClient from './NotAnIssueClient'

export default async function NotAnIssuePage() {
  const supabase = createServiceClient()

  const { data: items } = await supabase
    .from('gmail_inbox')
    .select('*')
    .in('agent_decision', ['not_an_issue', 'not_an_issue_human'])
    .order('created_at', { ascending: false })

  return <NotAnIssueClient items={items ?? []} />
}
