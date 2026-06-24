import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import AgentClient from './AgentClient'

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!agent) notFound()

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: allSkills } = await supabase
    .from('skills')
    .select('*')
    .order('created_at', { ascending: true })

  const { data: agentSkills } = await supabase
    .from('agent_skills')
    .select('skill_id')
    .eq('agent_id', agent.id)

  const enabledSkillIds = new Set((agentSkills ?? []).map(s => s.skill_id))

  return <AgentClient agent={agent} runs={runs ?? []} skills={allSkills ?? []} enabledSkillIds={[...enabledSkillIds]} />
}
