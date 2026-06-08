import React from 'react'
import { createServiceClient } from '@/lib/supabase'
import type { RequestDetails } from '@/types/quote'
import type { EventCardData } from '../RequestDetailsCard'
import DetailsForm from './DetailsForm'

type SearchParams = {
  bt?: string | string[]
  travel?: string
  multiDay?: string
  date?: string
  clientType?: string
  event?: string
  request?: string
  edit?: string
  prefill?: string
}

export default async function DetailsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const eventId = typeof sp.event === 'string' ? sp.event : null
  const requestId = typeof sp.request === 'string' ? sp.request : null

  let eventPrefill: { formFields: Partial<import('@/types/quote').QuoteInputs>; eventCardData: EventCardData } | null = null

  if (eventId && !requestId) {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('events')
      .select('agency_name, agent_name, client_email, event_date, venue_name, venue_postcode, venue_address, location, guests, arrival_time, start_time, finish_time, load_out_time, request_details, is_agency')
      .eq('id', eventId)
      .single()
    if (data) {
      const rd = data.request_details as RequestDetails | null
      const autoArrival = data.arrival_time
        ?? (data.start_time
          ? (() => {
              const [h, m] = data.start_time.split(':').map(Number)
              const arrMins = h * 60 + m - 60
              const norm = ((arrMins % 1440) + 1440) % 1440
              return `${String(Math.floor(norm / 60)).padStart(2, '0')}:${String(norm % 60).padStart(2, '0')}`
            })()
          : null)
      const autoLoadOut = data.load_out_time ?? data.finish_time ?? null
      eventPrefill = {
        formFields: {
          agency_name: data.agency_name ?? undefined,
          agent_name: data.agent_name ?? undefined,
          client_email: data.client_email ?? undefined,
          event_date: data.event_date ?? undefined,
          venue_name: data.venue_name ?? undefined,
          venue_postcode: data.venue_postcode ?? undefined,
          location: data.location ?? undefined,
          band_size_requested: rd?.band_size_requested ?? undefined,
          sets_requested: rd?.sets_requested ?? undefined,
          arrival_time: autoArrival ?? undefined,
          start_time: data.start_time ?? undefined,
          finish_time: data.finish_time ?? undefined,
          load_out_time: autoLoadOut ?? undefined,
        },
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

  return (
    <React.Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading…</div>}>
      <DetailsForm eventPrefill={eventPrefill} />
    </React.Suspense>
  )
}
