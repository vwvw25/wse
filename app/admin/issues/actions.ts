'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function updateIssue(id: string, fields: Record<string, unknown>) {
  const supabase = createServiceClient()
  await supabase.from('issues').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/admin/issues')
  revalidatePath(`/admin/issues/${id}`)
}

export async function createIssue(fields: Record<string, unknown>) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('issues').insert(fields).select().single()
  if (error) throw error
  revalidatePath('/admin/issues')
  return data
}

export async function deleteIssue(id: string) {
  const supabase = createServiceClient()
  await supabase.from('issues').delete().eq('id', id)
  revalidatePath('/admin/issues')
}
