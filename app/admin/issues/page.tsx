import { createServiceClient } from '@/lib/supabase'
import IssuesClient from './IssuesClient'

export default async function IssuesPage() {
  const supabase = createServiceClient()
  const { data: issues } = await supabase
    .from('issues')
    .select('*, pm_events(id, name, date), tasks:issues!parent_issue_id(id, status)')
    .is('parent_issue_id', null)
    .order('created_at', { ascending: false })

  const { data: pmEvents } = await supabase
    .from('pm_events')
    .select('id, name')
    .order('name')

  return <IssuesClient issues={issues ?? []} pmEvents={pmEvents ?? []} />
}
