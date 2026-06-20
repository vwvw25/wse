import { createServiceClient } from '@/lib/supabase'
import TriageClient from './TriageClient'

export default async function TriagePage() {
  const supabase = createServiceClient()
  const { data: issues } = await supabase
    .from('issues')
    .select('*, pm_events(id, name)')
    .eq('status', 'triage')
    .order('created_at', { ascending: false })

  const { data: pmEvents } = await supabase
    .from('pm_events')
    .select('id, name')
    .order('name')

  return <TriageClient issues={issues ?? []} pmEvents={pmEvents ?? []} />
}
