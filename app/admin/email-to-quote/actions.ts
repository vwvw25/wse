'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import type { RequestDetails, BookingType, TravelType } from '@/types/quote'
import fs from 'fs'
import path from 'path'

// Turbopack dev workaround: env vars not always available in server actions
function getAnthropicKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  try {
    const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = envFile.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    if (match) return match[1].trim()
  } catch {}
  return ''
}

export interface ExtractedAutoFill {
  is_agency: boolean
  agency_name: string | null
  agent_name: string | null
  agent_first_name: string | null
  agent_surname: string | null
  client_email: string | null
  client_phone: string | null
  source: string | null
  source_job_url: string | null
  event_date: string | null
  event_type: string | null
  venue_name: string | null
  venue_postcode: string | null
  venue_address: string | null
  location: string | null
  guests: number | null
  arrival_time: string | null
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

function buildSystemPrompt() {
  const year = new Date().getFullYear()
  return `You are extracting booking enquiry details from an email sent to a music entertainment agency. Return ONLY valid JSON — no explanation, no markdown, no code fences.

The current year is ${year}. When a date is given without a year (e.g. "14th March", "22nd November"), assume it is in ${year}.

AUTO_FILL fields:
- is_agency: boolean (true if from an agent/agency, false if direct client)
- agency_name: string or null (only when is_agency true)
- agent_name: string or null — full name (e.g. "Hettie Ralph") — for agents only; for direct clients use agent_first_name + agent_surname
- agent_first_name: string or null — first name only (e.g. "Hettie"); for direct clients this is the client's first name
- agent_surname: string or null — surname only (e.g. "Ralph"); for direct clients this is the client's surname
- client_email: string or null (sender's email)
- client_phone: string or null (phone number — especially useful for direct bookings)
- event_date: string or null — YYYY-MM-DD
- event_type: string or null — e.g. "Corporate Event", "Charity Ball", "Wedding", "Summer Party", "Awards Ceremony", "Private Dinner", "Birthday Party"
- venue_name: string or null — name of the venue
- venue_postcode: string or null
- venue_address: string or null — full address if given
- location: string or null — area/city when no address (e.g. "Central London", "Essex", "Buckinghamshire")
- guests: integer or null
- arrival_time: string or null — HH:MM 24hr (load-in / set-up time)
- start_time: string or null — HH:MM 24hr (performance start)
- finish_time: string or null — HH:MM 24hr (performance end)
- load_out_time: string or null — HH:MM 24hr (usually same as finish unless specified)
- booking_types: array from: "background" (no dancing), "dancing_under_40" (dancing <40 guests), "dancing_over_40" (dancing 40+ guests), "wedding"
- travel_type: "london_based" | "uk" | "domestic_overnight" | "international" | null

REQUEST_DETAILS (shown for reference, not auto-filled):
- special_requirements: string or null — rooftop, boat, outdoor, no lift, arena, stadium, access issues
- sound_requirements: string or null — acoustic only, db limiter, client providing PA, sound curfew
- band_size_requested: string or null — e.g. "acoustic duo", "trio", "4 piece", "3-5 artists"
- sets_requested: string or null — e.g. "2 x 45 min", "3 sets of 45"
- notes: string or null — anything else relevant (urgency, charity rate request, specific artist request, etc.)
- roaming_requested: boolean or null — true if client has specifically requested a roaming/walkabout set or roaming band

Return exactly:
{"auto_fill":{...},"request_details":{...}}

--- EXAMPLES ---

Email: "Hi Victoria, new enquiry for acoustic duo please: Date: 12th Dec. Timings: 2-5pm (set up by 1pm). Location: The Gherkin. Guests: 90. Please provide small PA. Kind regards, Hettie Ralph, AOK Entertains"
Output: {"auto_fill":{"is_agency":true,"agency_name":"AOK Entertains","agent_name":"Hettie Ralph","agent_first_name":"Hettie","agent_surname":"Ralph","client_email":null,"event_date":null,"event_type":null,"venue_name":"The Gherkin","venue_postcode":null,"venue_address":null,"location":"London","guests":90,"arrival_time":"13:00","start_time":"14:00","finish_time":"17:00","load_out_time":"17:00","booking_types":["background"],"travel_type":"london_based"},"request_details":{"special_requirements":null,"sound_requirements":"Client requesting PA provided","band_size_requested":"acoustic duo","sets_requested":null,"notes":null}}

Email: "Hi Victoria, Type of event: Great Gatsby Charity Ball. Date: 14th March. Venue: Orsett House, Essex. Event timings: 18:30-0:00. Entertainment timings: TBC. Would you be able to reduce your rate for this charity event? Tiger Cronk, AOK Entertains"
Output: {"auto_fill":{"is_agency":true,"agency_name":"AOK Entertains","agent_name":"Tiger Cronk","agent_first_name":"Tiger","agent_surname":"Cronk","client_email":"tiger@aokevents.com","event_date":null,"event_type":"Charity Ball","venue_name":"Orsett House","venue_postcode":null,"venue_address":null,"location":"Essex","guests":null,"arrival_time":null,"start_time":"18:30","finish_time":"00:00","load_out_time":"00:00","booking_types":["dancing_over_40"],"travel_type":"domestic_overnight"},"request_details":{"special_requirements":null,"sound_requirements":null,"band_size_requested":null,"sets_requested":null,"notes":"Charity event — client requesting reduced rate. Bowel Cancer UK charity."}}

Email: "Hi Victoria, I've got an enquiry for your Trio for a private awards dinner at the Rosewood London on the 10th of April. Start time is roughly 20:00. We'd need you to bring your small PA set up. Let me know availability and pricing. Iain Alexander, Blank Canvas Entertainment"
Output: {"auto_fill":{"is_agency":true,"agency_name":"Blank Canvas Entertainment","agent_name":"Iain Alexander","agent_first_name":"Iain","agent_surname":"Alexander","client_email":"Iain@blankcanvasentertainment.co.uk","event_date":null,"event_type":"Awards Dinner","venue_name":"Rosewood London","venue_postcode":null,"venue_address":null,"location":"London","guests":null,"arrival_time":null,"start_time":"20:00","finish_time":null,"load_out_time":null,"booking_types":["background"],"travel_type":"london_based"},"request_details":{"special_requirements":null,"sound_requirements":"Small PA required","band_size_requested":"trio","sets_requested":null,"notes":null}}

Email: "Hi Victoria, Can you let me know if Harper and Bailey duo can do 22nd November at The Bradfield Centre, 184 Cambridge Science Park Rd, Milton, Cambridge CB4 0GA. Quote bringing PA, 150 guests, 3x45 mins over 3 hours, early evening. Laura Elliott, Sternberg Clarke"
Output: {"auto_fill":{"is_agency":true,"agency_name":"Sternberg Clarke","agent_name":"Laura Elliott","agent_first_name":"Laura","agent_surname":"Elliott","client_email":"laura@sternbergclarke.co.uk","event_date":null,"event_type":null,"venue_name":"The Bradfield Centre","venue_postcode":"CB4 0GA","venue_address":"184 Cambridge Science Park Rd, Milton, Cambridge CB4 0GA","location":"Cambridge","guests":150,"arrival_time":null,"start_time":null,"finish_time":null,"load_out_time":null,"booking_types":["background"],"travel_type":"uk"},"request_details":{"special_requirements":null,"sound_requirements":"PA required","band_size_requested":"duo","sets_requested":"3 x 45 mins","notes":null}}
`
}

export async function extractFromEmail(emailText: string): Promise<EmailExtractResult> {
  const client = new Anthropic({ apiKey: getAnthropicKey() })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: emailText }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  return JSON.parse(cleaned) as EmailExtractResult
}

export async function saveEvent(
  result: EmailExtractResult,
  rawEmail: string,
  originalParse: EmailExtractResult,
): Promise<{ eventId: string; quoteRequestId: string | null }> {
  const supabase = createServiceClient()
  const af = result.auto_fill

  // Save event with all parsed details
  const { data, error } = await supabase
    .from('events')
    .insert({
      agency_name: af.agency_name,
      agent_name: af.agent_name,
      agent_first_name: af.agent_first_name,
      agent_surname: af.agent_surname,
      client_email: af.client_email,
      client_phone: af.client_phone,
      source: af.source,
      source_job_url: af.source_job_url,
      is_agency: af.is_agency,
      event_date: af.event_date,
      event_type: af.event_type,
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
      status: 'enquiry',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to save event')
  const eventId = data.id as string

  // Create quote request record
  let quoteRequestId: string | null = null
  try {
    const { data: qr } = await supabase
      .from('quote_requests')
      .insert({
        event_id: eventId,
        auto_fill: result.auto_fill,
        request_details: result.request_details,
      })
      .select('id')
      .single()
    quoteRequestId = qr?.id ?? null
  } catch {
    // non-fatal
  }

  // Save eval record — non-critical
  try {
    await supabase.from('email_parse_evals').insert({
      event_id: eventId,
      parsed_auto_fill: originalParse.auto_fill,
      parsed_request_details: originalParse.request_details,
      saved_auto_fill: result.auto_fill,
      saved_request_details: result.request_details,
    })
  } catch {
    // non-fatal
  }

  return { eventId, quoteRequestId }
}
