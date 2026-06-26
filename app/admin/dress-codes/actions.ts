'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface DressCodeTemplate {
  id: string
  name: string
  description: string | null
  created_at: string
}

export async function createDressCodeTemplate(formData: FormData) {
  const supabase = createServiceClient()
  await supabase.from('dress_code_templates').insert({
    name: (formData.get('name') as string).trim(),
    description: (formData.get('description') as string)?.trim() || null,
  })
  revalidatePath('/admin/dress-codes')
}

export async function updateDressCodeTemplate(id: string, formData: FormData) {
  const supabase = createServiceClient()
  await supabase.from('dress_code_templates').update({
    name: (formData.get('name') as string).trim(),
    description: (formData.get('description') as string)?.trim() || null,
  }).eq('id', id)
  revalidatePath('/admin/dress-codes')
}

export async function deleteDressCodeTemplate(id: string) {
  const supabase = createServiceClient()
  await supabase.from('dress_code_templates').delete().eq('id', id)
  revalidatePath('/admin/dress-codes')
}
