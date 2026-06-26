'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { EventStatus } from '@/lib/event-statuses'

export async function updateEventStatus(eventId: string, status: EventStatus) {
  const supabase = createServiceClient()
  await supabase.from('events').update({ status }).eq('id', eventId)
  revalidatePath(`/admin/events/${eventId}`)
  revalidatePath('/admin/events')
  revalidatePath('/admin/bookings')
}

export interface ContractFlag {
  field: string
  label: string
  contract_value: string
  event_value: string
}

const FIELD_LABELS: Record<string, string> = {
  event_date: 'Event date',
  agency_name: 'Agency',
  agent_name: 'Agent',
  client_email: 'Client email',
  venue_name: 'Venue',
  venue_address: 'Venue address',
  venue_postcode: 'Postcode',
  location: 'Location',
  guests: 'Guests',
  arrival_time: 'Arrival time',
  start_time: 'Start time',
  finish_time: 'Finish time',
  load_out_time: 'Load out time',
  band_size_requested: 'Band size',
  sets_requested: 'Sets',
}

async function logFieldChange(
  supabase: ReturnType<typeof import('@/lib/supabase').createServiceClient>,
  eventId: string,
  field: string,
  oldValue: string | null | undefined,
  newValue: string | number | null,
  source: string,
) {
  await supabase.from('event_activity_log').insert({
    event_id: eventId,
    field,
    field_label: FIELD_LABELS[field] ?? field,
    old_value: oldValue ?? null,
    new_value: newValue != null ? String(newValue) : null,
    source,
  })
}

export async function saveContractReview(
  eventId: string,
  acceptedFields: Record<string, string | number | null>,
  flags: ContractFlag[],
  parsed: Record<string, string | number | null>,
) {
  const supabase = createServiceClient()

  // Separate top-level event fields from request_details fields
  const RD_FIELDS = ['band_size_requested', 'sets_requested']
  const eventUpdate: Record<string, unknown> = {}
  const rdUpdate: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(acceptedFields)) {
    if (RD_FIELDS.includes(key)) {
      rdUpdate[key] = value
    } else {
      eventUpdate[key] = value
    }
  }

  // Merge request_details if needed
  let currentRd: Record<string, unknown> = {}
  if (Object.keys(rdUpdate).length > 0) {
    const { data: current } = await supabase
      .from('events')
      .select('request_details')
      .eq('id', eventId)
      .single()
    currentRd = current?.request_details ?? {}
    eventUpdate.request_details = { ...currentRd, ...rdUpdate }
  }

  // Fetch current event values for the activity log
  const { data: currentEvent0 } = await supabase.from('events').select('*').eq('id', eventId).single()

  // Log accepted field changes
  const logPromises: Promise<unknown>[] = []
  for (const [key, newValue] of Object.entries(acceptedFields)) {
    const isRd = RD_FIELDS.includes(key)
    const oldValue = isRd
      ? String((currentRd[key] ?? currentEvent0?.request_details?.[key]) ?? '')
      : String((currentEvent0?.[key as keyof typeof currentEvent0] ?? '') ?? '')
    logPromises.push(logFieldChange(supabase, eventId, key, oldValue || null, newValue, 'contract_review'))
  }
  await Promise.all(logPromises)

  // Fetch current contract so we can preserve file info and attachments
  const { data: currentEvent } = await supabase.from('events').select('contract').eq('id', eventId).single()
  const existingContract = currentEvent?.contract ?? {}

  // Save contract metadata — preserve file fields and attachments from the upload
  eventUpdate.contract = {
    ...existingContract,
    parsed,
    flags,
    uploaded_at: existingContract.uploaded_at ?? new Date().toISOString(),
  }

  const { error } = await supabase
    .from('events')
    .update(eventUpdate)
    .eq('id', eventId)

  if (error) throw error

  revalidatePath(`/admin/events/${eventId}`)
}

export async function saveContractParsed(
  eventId: string,
  parsed: Record<string, string | number | null>,
  file?: { name: string; size: number; path: string },
) {
  const supabase = createServiceClient()

  // Preserve any existing attachments when replacing the primary contract
  const { data: existing } = await supabase.from('events').select('contract').eq('id', eventId).single()
  const existingAttachments = existing?.contract?.attachments ?? []

  await supabase
    .from('events')
    .update({
      contract: {
        parsed,
        flags: [],
        uploaded_at: new Date().toISOString(),
        ...(file ? { file_path: file.path, file_name: file.name, file_size: file.size } : {}),
        attachments: existingAttachments,
      },
    })
    .eq('id', eventId)
  revalidatePath(`/admin/events/${eventId}`)
}

export async function deleteContract(eventId: string) {
  const supabase = createServiceClient()
  // Remove ALL files from storage (primary + attachments)
  const { data } = await supabase.from('events').select('contract').eq('id', eventId).single()
  const filePaths: string[] = []
  if (data?.contract?.file_path) filePaths.push(data.contract.file_path)
  for (const att of data?.contract?.attachments ?? []) {
    if (att.path && !filePaths.includes(att.path)) filePaths.push(att.path)
  }
  if (filePaths.length > 0) {
    await supabase.storage.from('contracts').remove(filePaths).catch(() => {})
  }
  await supabase.from('events').update({ contract: null }).eq('id', eventId)
  revalidatePath(`/admin/events/${eventId}`)
}

export async function acceptContractFlag(eventId: string, flag: ContractFlag) {
  const supabase = createServiceClient()

  // Apply the contract value to the event
  const RD_FIELDS = ['band_size_requested', 'sets_requested']
  const eventUpdate: Record<string, unknown> = {}

  if (RD_FIELDS.includes(flag.field === 'band_size' ? 'band_size_requested' : flag.field)) {
    const rdKey = flag.field === 'band_size' ? 'band_size_requested' : flag.field
    const { data: current } = await supabase.from('events').select('request_details').eq('id', eventId).single()
    eventUpdate.request_details = { ...(current?.request_details ?? {}), [rdKey]: flag.contract_value }
  } else {
    eventUpdate[flag.field] = flag.contract_value
  }

  // Log the change
  await logFieldChange(supabase, eventId, flag.field, flag.event_value || null, flag.contract_value, 'contract_review')

  // Remove the flag
  const { data } = await supabase.from('events').select('contract').eq('id', eventId).single()
  const contract = (data?.contract ?? {}) as { parsed?: unknown; flags?: ContractFlag[]; uploaded_at?: string }
  const flags = (contract.flags ?? []).filter((f: ContractFlag) => f.field !== flag.field)
  eventUpdate.contract = { ...contract, flags }

  await supabase.from('events').update(eventUpdate).eq('id', eventId)
  revalidatePath(`/admin/events/${eventId}`)
}

export async function resolveContractFlag(eventId: string, fieldKey: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('events')
    .select('contract')
    .eq('id', eventId)
    .single()

  const contract = (data?.contract ?? {}) as { parsed?: unknown; flags?: ContractFlag[]; uploaded_at?: string }
  const flags = (contract.flags ?? []).filter((f: ContractFlag) => f.field !== fieldKey)

  await supabase
    .from('events')
    .update({ contract: { ...contract, flags } })
    .eq('id', eventId)

  revalidatePath(`/admin/events/${eventId}`)
}

export async function updateBookingDetails(
  eventId: string,
  data: { booked_band_size: string | null; booked_sets: string | null; booked_fee: number | null }
) {
  const supabase = createServiceClient()
  await supabase.from('events').update(data).eq('id', eventId)
  revalidatePath(`/admin/events/${eventId}`)
}

export async function deleteEvent(eventId: string) {
  const supabase = createServiceClient()
  // Unlink any quotes that reference this event before deleting
  await supabase.from('quotes').update({ event_id: null }).eq('event_id', eventId)
  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) throw error
  revalidatePath('/admin/events')
  redirect('/admin/events')
}

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = createServiceClient()

  const isAgency = formData.get('is_agency') === 'true'
  const agencyName = (formData.get('agency_name') as string)?.trim() || null
  const agentName = (formData.get('agent_name') as string)?.trim() || null
  const agentFirstName = (formData.get('agent_first_name') as string)?.trim() || null
  const agentSurname = (formData.get('agent_surname') as string)?.trim() || null
  const clientEmail = (formData.get('client_email') as string)?.trim() || null
  const clientPhone = (formData.get('client_phone') as string)?.trim() || null
  const source = (formData.get('source') as string)?.trim() || null
  const sourceJobUrl = (formData.get('source_job_url') as string)?.trim() || null
  const eventDate = (formData.get('event_date') as string) || null
  const venueName = (formData.get('venue_name') as string)?.trim() || null
  const venuePostcode = (formData.get('venue_postcode') as string)?.trim() || null
  const venueAddress = (formData.get('venue_address') as string)?.trim() || null
  const location = (formData.get('location') as string)?.trim() || null
  const startTime = (formData.get('start_time') as string) || null
  const finishTime = (formData.get('finish_time') as string) || null
  const arrivalTime = (formData.get('arrival_time') as string) || null
  const loadOutTime = (formData.get('load_out_time') as string) || null
  const guestsRaw = formData.get('guests') as string
  const guests = guestsRaw ? parseInt(guestsRaw) : null

  const foodRaw = (formData.get('food') as string)?.trim() || null
  const food = foodRaw === 'yes' || foodRaw === 'no' || foodRaw === 'tbc' ? foodRaw : null

  const idRequiredRaw = (formData.get('id_required') as string)?.trim() || null
  const idRequired = idRequiredRaw === 'yes' ? true : idRequiredRaw === 'no' ? false : null

  const bookedBandTemplateId = (formData.get('booked_band_template_id') as string)?.trim() || null
  const bookedLineup = (formData.get('booked_lineup') as string)?.trim() || null
  const bookedSets = (formData.get('booked_sets') as string)?.trim() || null
  const foodNotes = (formData.get('food_notes') as string)?.trim() || null
  const dressCode = (formData.get('dress_code') as string)?.trim() || null

  const bandSizeRequested = (formData.get('band_size_requested') as string)?.trim() || null
  const setsRequested = (formData.get('sets_requested') as string)?.trim() || null
  const specialRequirements = (formData.get('special_requirements') as string)?.trim() || null
  const soundRequirements = (formData.get('sound_requirements') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null
  const roamingRequested = formData.get('roaming_requested') === 'on' ? true : false

  const requestDetails = (bandSizeRequested || setsRequested || specialRequirements || soundRequirements || notes || roamingRequested)
    ? { band_size_requested: bandSizeRequested, sets_requested: setsRequested, special_requirements: specialRequirements, sound_requirements: soundRequirements, notes, roaming_requested: roamingRequested || null }
    : null

  const { error } = await supabase
    .from('events')
    .update({
      is_agency: isAgency,
      agency_name: isAgency ? agencyName : null,
      agent_name: isAgency ? agentName : null,
      agent_first_name: agentFirstName,
      agent_surname: agentSurname,
      client_email: clientEmail,
      client_phone: clientPhone,
      source,
      source_job_url: sourceJobUrl,
      event_date: eventDate,
      venue_name: venueName,
      venue_postcode: venuePostcode,
      venue_address: venueAddress,
      location,
      start_time: startTime,
      finish_time: finishTime,
      arrival_time: arrivalTime,
      load_out_time: loadOutTime,
      guests,
      food,
      food_notes: foodNotes,
      dress_code: dressCode,
      id_required: idRequired,
      booked_band_template_id: bookedBandTemplateId,
      booked_lineup: bookedLineup,
      booked_sets: bookedSets,
      request_details: requestDetails,
    })
    .eq('id', eventId)

  if (error) throw error

  revalidatePath(`/admin/events/${eventId}`)
  revalidatePath('/admin/events')
  redirect(`/admin/events/${eventId}`)
}

export async function createEvent(formData: FormData) {
  const supabase = createServiceClient()

  const str = (key: string) => (formData.get(key) as string)?.trim() || null
  const time = (key: string) => (formData.get(key) as string) || null

  const isAgency = formData.get('is_agency') === 'true'
  const guestsRaw = formData.get('guests') as string
  const bookedFeeRaw = formData.get('booked_fee') as string

  const bandSizeRequested = str('band_size_requested')
  const setsRequested = str('sets_requested')
  const specialRequirements = str('special_requirements')

  const requestDetails = (bandSizeRequested || setsRequested || specialRequirements)
    ? {
        band_size_requested: bandSizeRequested,
        sets_requested: setsRequested,
        special_requirements: specialRequirements,
        sound_requirements: null,
        notes: null,
        roaming_requested: null,
      }
    : null

  const { data, error } = await supabase
    .from('events')
    .insert({
      is_agency: isAgency,
      agency_name: str('agency_name'),
      agent_name: str('agent_name'),
      client_email: str('client_email'),
      client_phone: str('client_phone'),
      event_date: time('event_date'),
      event_type: str('event_type'),
      venue_name: str('venue_name'),
      venue_postcode: str('venue_postcode'),
      venue_address: str('venue_address'),
      location: str('location'),
      arrival_time: time('arrival_time'),
      start_time: time('start_time'),
      finish_time: time('finish_time'),
      load_out_time: time('load_out_time'),
      guests: guestsRaw ? parseInt(guestsRaw) : null,
      booked_band_size: str('booked_band_size'),
      booked_sets: str('booked_sets'),
      booked_fee: bookedFeeRaw ? parseFloat(bookedFeeRaw) : null,
      dress_code: str('dress_code'),
      food: str('food') as 'yes' | 'no' | 'tbc' | null,
      food_notes: str('food_notes'),
      id_required: (() => { const v = str('id_required'); return v === 'yes' ? true : v === 'no' ? false : null })(),
      source: str('source'),
      source_job_url: str('source_job_url'),
      request_details: requestDetails,
      status: 'enquiry',
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath('/admin/events')
  redirect(`/admin/events/${data.id}`)
}

export interface ContractFileAttachment {
  path: string
  name: string
  size: number
  uploaded_at: string
}

export async function addContractAttachment(eventId: string, attachment: ContractFileAttachment) {
  const supabase = createServiceClient()
  const { data } = await supabase.from('events').select('contract').eq('id', eventId).single()
  const contract = data?.contract ?? {}
  const attachments = [...(contract.attachments ?? []), attachment]
  await supabase.from('events').update({ contract: { ...contract, attachments } }).eq('id', eventId)
  revalidatePath(`/admin/events/${eventId}`)
}

export async function deleteContractAttachment(eventId: string, filePath: string) {
  const supabase = createServiceClient()
  await supabase.storage.from('contracts').remove([filePath]).catch(() => {})
  const { data } = await supabase.from('events').select('contract').eq('id', eventId).single()
  const contract = data?.contract ?? {}
  const attachments = (contract.attachments ?? []).filter((a: ContractFileAttachment) => a.path !== filePath)
  await supabase.from('events').update({ contract: { ...contract, attachments } }).eq('id', eventId)
  revalidatePath(`/admin/events/${eventId}`)
}
