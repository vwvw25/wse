'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import type { RequestDetails, BookingType, TravelType } from '@/types/quote'

export interface ExtractedAutoFill {
  is_agency: boolean
  agency_name: string | null
  agent_name: string | null
  client_email: string | null
  event_date: string | null      // YYYY-MM-DD
  venue_name: string | null
  venue_postcode: string | null
  venue_address: string | null
  location: string | null        // free text when address/postcode not available
  guests: number | null
  arrival_time: string | null    // HH:MM
  start_time: string | null
  finish_time: string | null
  load_out_time: string | null
  booking_types: BookingType[]
  travel_type: TravelType | null
}

export interface EmailExtractResult {
  auto_fill: ExtractedAutoFill
  request_details: RequestDetails
}

const SYSTEM_PROMPT = `You are extracting booking enquiry details from an email sent to a music entertainment agency. Return ONLY valid JSON — no explanation, no markdown.

Extract two groups of fields:

AUTO_FILL — goes directly into the quote form:
- is_agency: boolean (true if from an agent/agency, false if direct client enquiry)
- agency_name: string or null
- agent_name: string or null
- client_email: string or null (sender's email address if visible)
- event_date: string or null — format YYYY-MM-DD
- venue_name: string or null — name of the venue
- venue_postcode: string or null — postcode of the venue if given
- venue_address: string or null — full address if given
- location: string or null — location description when address/postcode is not available (e.g. "Central London", "Manchester city centre", "Cotswolds")
- guests: integer or null — number of guests attending
- arrival_time: string or null — HH:MM 24hr (when band should arrive/load in)
- start_time: string or null — HH:MM 24hr (when performance begins)
- finish_time: string or null — HH:MM 24hr (when performance ends)
- load_out_time: string or null — HH:MM 24hr (when band can load out — often same as finish)
- booking_types: array — include all that apply from: "background" (background music, no dancing), "dancing_under_40" (dancing event, fewer than 40 guests), "dancing_over_40" (dancing event, 40+ guests), "wedding". Use dancing_under_40/over_40 based on guest count if mentioned, or dancing_over_40 as default for dance events without a count.
- travel_type: one of "london_based" (London venue), "uk" (UK day trip outside London, home same night), "domestic_overnight" (UK requiring overnight stay), "international" (outside UK) — or null if genuinely unclear

REQUEST_DETAILS — shown to the user for reference while filling the form, not auto-filled:
- special_requirements: string or null — venue quirks, access issues, load-in restrictions, outdoor/boat/rooftop/arena/stadium etc.
- sound_requirements: string or null — db limiters, acoustic-only requirement, client providing PA, sound curfews
- band_size_requested: string or null — e.g. "4 piece", "trio", "5-7 piece"
- sets_requested: string or null — e.g. "2 x 45 min sets", "3 sets"
- notes: string or null — anything else in the email relevant to quoting that doesn't fit the above fields

Return exactly this JSON shape:
{
  "auto_fill": { "is_agency": ..., "agency_name": ..., "agent_name": ..., "client_email": ..., "event_date": ..., "venue_name": ..., "venue_postcode": ..., "venue_address": ..., "location": ..., "guests": ..., "arrival_time": ..., "start_time": ..., "finish_time": ..., "load_out_time": ..., "booking_types": [...], "travel_type": ... },
  "request_details": { "special_requirements": ..., "sound_requirements": ..., "band_size_requested": ..., "sets_requested": ..., "notes": ... }
}`

export async function extractFromEmail(emailText: string): Promise<EmailExtractResult> {
  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: emailText }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  return JSON.parse(cleaned) as EmailExtractResult
}

export async function saveEvent(result: EmailExtractResult, rawEmail: string): Promise<string> {
  const supabase = createServiceClient()
  const af = result.auto_fill

  const { data, error } = await supabase
    .from('events')
    .insert({
      agency_name: af.agency_name,
      agent_name: af.agent_name,
      client_email: af.client_email,
      is_agency: af.is_agency,
      event_date: af.event_date,
      venue_name: af.venue_name,
      venue_postcode: af.venue_postcode,
      venue_address: af.venue_address,
      location: af.location,
      guests: af.guests,
      arrival_time: af.arrival_time,
      start_time: af.start_time,
      finish_time: af.finish_time,
      load_out_time: af.load_out_time,
      request_details: result.request_details,
      raw_email: rawEmail,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to save event')
  return data.id as string
}
