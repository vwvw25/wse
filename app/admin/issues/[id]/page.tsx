import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import IssueDetailClient from './IssueDetailClient'

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: issue } = await supabase
    .from('issues')
    .select('*, pm_events(id, name)')
    .eq('id', id)
    .single()

  if (!issue) notFound()

  const { data: subIssues } = await supabase
    .from('issues')
    .select('*')
    .eq('parent_issue_id', id)
    .order('created_at')

  const { data: pmEvents } = await supabase
    .from('pm_events')
    .select('id, name')
    .order('name')

  return <IssueDetailClient issue={issue} subIssues={subIssues ?? []} pmEvents={pmEvents ?? []} />
}
