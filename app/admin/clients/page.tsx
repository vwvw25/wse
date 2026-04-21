import { createServiceClient } from '@/lib/supabase'
import type { Client } from '@/types/invoice'
import ClientsClient from './ClientsClient'

export default async function ClientsPage() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('clients').select('*').order('name')
  const clients = (data ?? []) as Client[]

  return <ClientsClient clients={clients} />
}
