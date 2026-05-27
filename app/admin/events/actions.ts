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
  if (Object.keys(rdUpdate).length > 0) {
    const { data: current } = await supabase
      .from('events')
      .select('request_details')
      .eq('id', eventId)
      .single()
    eventUpdate.request_details = { ...(current?.request_details ?? {}), ...rdUpdate }
  }

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
  const clientEmail = (formData.get('client_email') as string)?.trim() || null
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

  const bookedBandTemplateId = (formData.get('booked_band_template_id') as string)?.trim() || null
  const bookedLineup = (formData.get('booked_lineup') as string)?.trim() || null
  const bookedSets = (formData.get('booked_sets') as string)?.trim() || null
  const foodNotes = (formData.get('food_notes') as string)?.trim() || null

  const bandSizeRequested = (formData.get('band_size_requested') as string)?.trim() || null
  const setsRequested = (formData.get('sets_requested') as string)?.trim() || null
  const specialRequirements = (formData.get('special_requirements') as string)?.trim() || null
  const soundRequirements = (formData.get('sound_requirements') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  const requestDetails = (bandSizeRequested || setsRequested || specialRequirements || soundRequirements || notes)
    ? { band_size_requested: bandSizeRequested, sets_requested: setsRequested, special_requirements: specialRequirements, sound_requirements: soundRequirements, notes }
    : null

  const { error } = await supabase
    .from('events')
    .update({
      is_agency: isAgency,
      agency_name: agencyName,
      agent_name: agentName,
      client_email: clientEmail,
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

  const isAgency = formData.get('is_agency') === 'true'
  const agencyName = (formData.get('agency_name') as string)?.trim() || null
  const agentName = (formData.get('agent_name') as string)?.trim() || null
  const clientEmail = (formData.get('client_email') as string)?.trim() || null
  const eventDate = (formData.get('event_date') as string) || null
  const venueName = (formData.get('venue_name') as string)?.trim() || null
  const venuePostcode = (formData.get('venue_postcode') as string)?.trim() || null
  const location = (formData.get('location') as string)?.trim() || null
  const startTime = (formData.get('start_time') as string) || null
  const finishTime = (formData.get('finish_time') as string) || null
  const arrivalTime = (formData.get('arrival_time') as string) || null
  const loadOutTime = (formData.get('load_out_time') as string) || null
  const guestsRaw = formData.get('guests') as string
  const guests = guestsRaw ? parseInt(guestsRaw) : null

  const { data, error } = await supabase
    .from('events')
    .insert({
      is_agency: isAgency,
      agency_name: agencyName,
      agent_name: agentName,
      client_email: clientEmail,
      event_date: eventDate,
      venue_name: venueName,
      venue_postcode: venuePostcode,
      location,
      start_time: startTime,
      finish_time: finishTime,
      arrival_time: arrivalTime,
      load_out_time: loadOutTime,
      guests,
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
