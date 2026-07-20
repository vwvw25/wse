import { createServiceClient } from '@/lib/supabase'

export interface DuplicateEventMatch {
  id: string
  event_date: string | null
  event_type: string | null
  venue_name: string | null
  agency_name: string | null
  agent_name: string | null
  client_email: string | null
  status: string
}

export interface DuplicateCheckInput {
  event_date: string | null
  venue_name: string | null
  venue_postcode: string | null
  client_email: string | null
  agency_name: string | null
  agent_name: string | null
  excludeEventId?: string
}

const norm = (s: string | null | undefined) => s?.trim().toLowerCase() || null

// Same date alone doesn't mean the same event (multiple bookings can genuinely
// share a date), so this also requires an overlapping venue or client signal.
export async function findPotentialDuplicateEvents(input: DuplicateCheckInput): Promise<DuplicateEventMatch[]> {
  if (!input.event_date) return []

  const venueName = norm(input.venue_name)
  const venuePostcode = norm(input.venue_postcode)
  const clientEmail = norm(input.client_email)
  const agencyName = norm(input.agency_name)
  const agentName = norm(input.agent_name)

  if (!venueName && !venuePostcode && !clientEmail && !agencyName && !agentName) return []

  const supabase = createServiceClient()
  let query = supabase
    .from('events')
    .select('id, event_date, event_type, venue_name, venue_postcode, agency_name, agent_name, client_email, status')
    .eq('event_date', input.event_date)
    .not('status', 'in', '(cancelled,client_declined,not_booked)')

  if (input.excludeEventId) query = query.neq('id', input.excludeEventId)

  const { data, error } = await query
  if (error || !data) return []

  return data
    .filter(ev => {
      const venueMatch = (!!venueName && norm(ev.venue_name) === venueName) ||
        (!!venuePostcode && norm(ev.venue_postcode) === venuePostcode)
      const clientMatch = (!!clientEmail && norm(ev.client_email) === clientEmail) ||
        (!!agencyName && norm(ev.agency_name) === agencyName) ||
        (!!agentName && norm(ev.agent_name) === agentName)
      return venueMatch || clientMatch
    })
    .map(ev => ({
      id: ev.id,
      event_date: ev.event_date,
      event_type: ev.event_type,
      venue_name: ev.venue_name,
      agency_name: ev.agency_name,
      agent_name: ev.agent_name,
      client_email: ev.client_email,
      status: ev.status,
    }))
}
