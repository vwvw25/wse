import { createServiceClient } from '@/lib/supabase'

const INSTRUCTION_FILE_ORDER = ['AGENTS.md', 'HEARTBEAT.md', 'SOUL.md', 'TOOLS.md']

export async function buildAgentPrompt(agentId: string, fallbackPrompt: string): Promise<string> {
  const supabase = createServiceClient()

  const { data: agent } = await supabase
    .from('agents')
    .select('system_prompt, instruction_files')
    .eq('id', agentId)
    .single()

  // Fetch enabled skills for this agent
  const { data: agentSkills } = await supabase
    .from('agent_skills')
    .select('skill_id')
    .eq('agent_id', agentId)

  const skillIds = (agentSkills ?? []).map(s => s.skill_id)
  let skillsContent = ''

  if (skillIds.length > 0) {
    const { data: skills } = await supabase
      .from('skills')
      .select('name, content')
      .in('id', skillIds)

    const filledSkills = (skills ?? []).filter(s => s.content?.trim())
    if (filledSkills.length > 0) {
      skillsContent = '\n\n---\n## Skills\n\n' +
        filledSkills.map(s => `### ${s.name}\n${s.content}`).join('\n\n')
    }
  }

  const files = (agent?.instruction_files ?? {}) as Record<string, string>
  const hasFiles = INSTRUCTION_FILE_ORDER.some(f => files[f]?.trim())

  if (hasFiles) {
    // Use instruction files as the prompt, with skills appended
    const parts: string[] = []
    for (const filename of INSTRUCTION_FILE_ORDER) {
      if (files[filename]?.trim()) {
        parts.push(`## ${filename}\n\n${files[filename].trim()}`)
      }
    }
    return parts.join('\n\n---\n\n') + skillsContent
  }

  // Fall back to system_prompt or the hardcoded default
  return (agent?.system_prompt ?? fallbackPrompt) + skillsContent
}
