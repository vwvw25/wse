'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface AvSetup {
  id: string
  name: string
  created_at: string
}

export async function createAvSetup(formData: FormData) {
  const supabase = createServiceClient()
  await supabase.from('av_setups').insert({
    name: (formData.get('name') as string).trim(),
  })
  revalidatePath('/admin/av-setups')
}

export async function updateAvSetup(id: string, formData: FormData) {
  const supabase = createServiceClient()
  await supabase.from('av_setups').update({
    name: (formData.get('name') as string).trim(),
  }).eq('id', id)
  revalidatePath('/admin/av-setups')
}

export async function deleteAvSetup(id: string) {
  const supabase = createServiceClient()
  await supabase.from('av_setups').delete().eq('id', id)
  revalidatePath('/admin/av-setups')
}
