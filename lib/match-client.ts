import { createServiceClient } from '@/lib/supabase'
import type { Client } from '@/types/invoice'

export interface ClientMatchInput {
  client_email: string | null
  is_agency: boolean
  agency_name: string | null
  agent_name: string | null
  agent_first_name: string | null
  agent_surname: string | null
}

const norm = (s: string | null | undefined) => s?.trim().toLowerCase() || null

// Email is the strongest signal (survives agent name typos/variants), so it's checked
// across all clients regardless of type before falling back to an exact name match
// scoped to the matching client type (agency vs direct).
export async function findMatchingClient(input: ClientMatchInput): Promise<Client | null> {
  const email = norm(input.client_email)
  const agencyName = norm(input.agency_name)
  const directName = norm(input.agent_name) ??
    norm([input.agent_first_name, input.agent_surname].filter(Boolean).join(' '))

  if (!email && !agencyName && !directName) return null

  const supabase = createServiceClient()
  const { data, error } = await supabase.from('clients').select('*')
  if (error || !data) return null
  const clients = data as Client[]

  if (email) {
    const byEmail = clients.find(c => norm(c.email) === email)
    if (byEmail) return byEmail
  }

  const nameToMatch = input.is_agency ? agencyName : directName
  const expectedType = input.is_agency ? 'agency' : 'direct'
  if (nameToMatch) {
    const byName = clients.find(c => c.client_type === expectedType && norm(c.name) === nameToMatch)
    if (byName) return byName
  }

  return null
}
