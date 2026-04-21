'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import type { ClientType } from '@/types/invoice'

export async function upsertClient(data: {
  id?: string
  name: string
  client_type: ClientType
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
}) {
  const supabase = createServiceClient()
  if (data.id) {
    await supabase.from('clients').update({
      name: data.name,
      client_type: data.client_type,
      email: data.email,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
    }).eq('id', data.id)
  } else {
    await supabase.from('clients').insert({
      name: data.name,
      client_type: data.client_type,
      email: data.email,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
    })
  }
  revalidatePath('/admin/clients')
}

export async function deleteClient(id: string) {
  const supabase = createServiceClient()
  await supabase.from('clients').delete().eq('id', id)
  revalidatePath('/admin/clients')
}
