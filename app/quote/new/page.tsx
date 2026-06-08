import { createServiceClient } from '@/lib/supabase'
import type { EventCardData } from './RequestDetailsCard'
import NewQuoteForm from './NewQuoteForm'

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; request?: string }>
}) {
  const { event: eventId = null, request: requestId = null } = await searchParams

  let prefill: { eventDate: string | null; clientType: 'agency' | 'direct' | null; eventCardData: EventCardData | null } | null = null

  if (requestId) {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('quote_requests')
      .select('auto_fill, request_details')
      .eq('id', requestId)
      .single()
    if (data) {
      const af = data.auto_fill as Record<string, unknown>
      const rd = data.request_details as Record<string, unknown> | null
      prefill = {
        eventDate: af.event_date as string | null,
        clientType: af.is_agency ? 'agency' : 'direct',
        eventCardData: {
          agency_name: af.agency_name as string | null,
          agent_name: af.agent_name as string | null,
          client_email: af.client_email as string | null,
          event_date: af.event_date as string | null,
          venue_name: af.venue_name as string | null,
          venue_postcode: af.venue_postcode as string | null,
          venue_address: af.venue_address as string | null,
          location: af.location as string | null,
          guests: af.guests as number | null,
          arrival_time: af.arrival_time as string | null,
          start_time: af.start_time as string | null,
          finish_time: af.finish_time as string | null,
          load_out_time: af.load_out_time as string | null,
          band_size_requested: rd?.band_size_requested as string | null ?? null,
          sets_requested: rd?.sets_requested as string | null ?? null,
          special_requirements: rd?.special_requirements as string | null ?? null,
          sound_requirements: rd?.sound_requirements as string | null ?? null,
          notes: rd?.notes as string | null ?? null,
        },
      }
    }
  } else if (eventId) {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('events')
      .select('agency_name, agent_name, client_email, is_agency, event_date, venue_name, venue_postcode, venue_address, location, guests, arrival_time, start_time, finish_time, load_out_time, request_details')
      .eq('id', eventId)
      .single()
    if (data) {
      const rd = data.request_details as { band_size_requested?: string | null; sets_requested?: string | null; special_requirements?: string | null; sound_requirements?: string | null; notes?: string | null } | null
      prefill = {
        eventDate: data.event_date,
        clientType: data.is_agency ? 'agency' : 'direct',
        eventCardData: {
          agency_name: data.agency_name,
          agent_name: data.agent_name,
          client_email: data.client_email,
          event_date: data.event_date,
          venue_name: data.venue_name,
          venue_postcode: data.venue_postcode,
          venue_address: data.venue_address,
          location: data.location,
          guests: data.guests,
          arrival_time: data.arrival_time,
          start_time: data.start_time,
          finish_time: data.finish_time,
          load_out_time: data.load_out_time,
          band_size_requested: rd?.band_size_requested ?? null,
          sets_requested: rd?.sets_requested ?? null,
          special_requirements: rd?.special_requirements ?? null,
          sound_requirements: rd?.sound_requirements ?? null,
          notes: rd?.notes ?? null,
        },
      }
    }
  }

  return <NewQuoteForm eventId={eventId} requestId={requestId} prefill={prefill} />
}
