'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function updateEvalNotes(evalId: string, notes: string | null) {
  const supabase = createServiceClient()
  await supabase
    .from('email_parse_evals')
    .update({ notes })
    .eq('id', evalId)
  revalidatePath('/admin/parse-evals')
}

export async function toggleEdgeCase(evalId: string, isEdgeCase: boolean) {
  const supabase = createServiceClient()
  await supabase
    .from('email_parse_evals')
    .update({ is_edge_case: isEdgeCase })
    .eq('id', evalId)
  revalidatePath('/admin/parse-evals')
}
