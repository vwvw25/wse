import { createServiceClient } from '@/lib/supabase'
import AgentsClient from './AgentsClient'

export default async function AgentsPage() {
  const supabase = createServiceClient()

  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: true })

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('agent_id, created_at, cost_usd')
    .order('created_at', { ascending: false })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastRun: Record<string, string> = {}
  const monthSpend: Record<string, number> = {}

  for (const run of runs ?? []) {
    if (!lastRun[run.agent_id]) lastRun[run.agent_id] = run.created_at
    if (new Date(run.created_at) >= monthStart) {
      monthSpend[run.agent_id] = (monthSpend[run.agent_id] ?? 0) + (run.cost_usd ?? 0)
    }
  }

  return <AgentsClient agents={agents ?? []} lastRun={lastRun} monthSpend={monthSpend} />
}
