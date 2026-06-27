'use server'

import { createServiceClient } from '@/lib/supabase'

export async function respondToProposal(
  proposalId: string,
  action: 'approved' | 'declined' | 'answered' | 'done' | 'reassigned',
  comment?: string,
) {
  const supabase = createServiceClient()

  const statusMap: Record<string, string> = {
    approved: 'approved',
    declined: 'declined',
    answered: 'answered',
    done: 'done',
    reassigned: 'reassigned',
  }

  await supabase
    .from('agent_proposals')
    .update({ status: statusMap[action] })
    .eq('id', proposalId)

  // If there's a comment, post it to issue_messages
  if (comment) {
    const { data: proposal } = await supabase
      .from('agent_proposals')
      .select('issue_id, action_ref')
      .eq('id', proposalId)
      .single()

    if (proposal?.issue_id) {
      const prefix = proposal.action_ref ? `Re: ${proposal.action_ref} — ` : ''
      await supabase
        .from('issue_messages')
        .insert({
          issue_id: proposal.issue_id,
          role: 'user',
          content: `${prefix}${comment}`,
        })
    }
  }
}
