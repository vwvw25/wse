'use server'

import { createServiceClient } from '@/lib/supabase'

export async function updateAgentPrompt(agentId: string, systemPrompt: string) {
  const supabase = createServiceClient()
  await supabase.from('agents').update({ system_prompt: systemPrompt }).eq('id', agentId)
}

export async function updateAgentConfig(agentId: string, fields: {
  name: string
  title: string
  reports_to: string
  capabilities: string
  adapter_type: string
}) {
  const supabase = createServiceClient()
  await supabase.from('agents').update(fields).eq('id', agentId)
}

export async function updateAgentBudget(agentId: string, monthlyBudgetUsd: number) {
  const supabase = createServiceClient()
  await supabase.from('agents').update({ monthly_budget_usd: monthlyBudgetUsd }).eq('id', agentId)
}

export async function toggleAgentSkill(agentId: string, skillId: string, enabled: boolean) {
  const supabase = createServiceClient()
  if (enabled) {
    await supabase.from('agent_skills').insert({ agent_id: agentId, skill_id: skillId })
  } else {
    await supabase.from('agent_skills').delete().eq('agent_id', agentId).eq('skill_id', skillId)
  }
}

export async function updateSkillContent(skillId: string, content: string) {
  const supabase = createServiceClient()
  await supabase.from('skills').update({ content }).eq('id', skillId)
}

export async function updateInstructionFile(agentId: string, filename: string, content: string) {
  const supabase = createServiceClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('instruction_files')
    .eq('id', agentId)
    .single()

  const files = (agent?.instruction_files ?? {}) as Record<string, string>
  files[filename] = content

  await supabase.from('agents').update({ instruction_files: files }).eq('id', agentId)
}
