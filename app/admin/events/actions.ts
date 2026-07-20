'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { EVENT_STATUSES } from '@/lib/event-statuses'
import type { EventStatus } from '@/lib/event-statuses'
import { logEventActivity } from '@/lib/event-activity'
import { findPotentialDuplicateEvents } from '@/lib/duplicate-events'
import type { DuplicateEventMatch } from '@/lib/duplicate-events'

export async function checkPotentialDuplicateEvents(formData: FormData): Promise<DuplicateEventMatch[]> {
  const str = (key: string) => (formData.get(key) as string)?.trim() || null
  return findPotentialDuplicateEvents({
    event_date: str('event_date'),
    venue_name: str('venue_name'),
    venue_postcode: str('venue_postcode'),
    client_email: str('client_email'),
    agency_name: str('agency_name'),
    agent_name: str('agent_name'),
  })
}

export async function addEventComment(eventId: string, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  await logEventActivity(eventId, { type: 'comment', summary: trimmed })
  revalidatePath(`/admin/events/${eventId}`)
}

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

// Labels for the request_details fields that a contract review can touch —
// these live inside a JSONB blob, so the events-table trigger can't see into
// them and diff them automatically the way it does for plain columns.
const FIELD_LABELS: Record<string, string> = {
  band_size_requested: 'Band size',
  sets_requested: 'Sets',
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

  // Merge request_details if needed, and log those changes explicitly — they
  // live inside a JSONB blob the events-table trigger can't see into. Plain
  // top-level fields in eventUpdate are logged automatically by that trigger
  // once the update below lands, so no manual logging is needed for those.
  let currentRd: Record<string, unknown> = {}
  if (Object.keys(rdUpdate).length > 0) {
    const { data: current } = await supabase
      .from('events')
      .select('request_details')
      .eq('id', eventId)
      .single()
    currentRd = current?.request_details ?? {}
    eventUpdate.request_details = { ...currentRd, ...rdUpdate }

    await Promise.all(Object.entries(rdUpdate).map(([key, newValue]) =>
      logEventActivity(eventId, {
        type: 'field_change',
        field: key,
        fieldLabel: FIELD_LABELS[key] ?? key,
        oldValue: currentRd[key] != null ? String(currentRd[key]) : null,
        newValue: newValue != null ? String(newValue) : null,
        source: 'contract_review',
      })
    ))
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
  await logEventActivity(eventId, { type: 'contract_change', summary: 'Contract uploaded' })
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
  const isRd = RD_FIELDS.includes(flag.field === 'band_size' ? 'band_size_requested' : flag.field)

  if (isRd) {
    // request_details is a JSONB blob the events-table trigger can't diff, so log explicitly.
    const rdKey = flag.field === 'band_size' ? 'band_size_requested' : flag.field
    const { data: current } = await supabase.from('events').select('request_details').eq('id', eventId).single()
    eventUpdate.request_details = { ...(current?.request_details ?? {}), [rdKey]: flag.contract_value }
    await logEventActivity(eventId, {
      type: 'field_change',
      field: rdKey,
      fieldLabel: FIELD_LABELS[rdKey] ?? rdKey,
      oldValue: flag.event_value || null,
      newValue: flag.contract_value,
      source: 'contract_review',
    })
  } else {
    // Plain top-level column — the events-table trigger logs this automatically on update.
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

export interface UpdateEventData {
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
  venue_name: string | null
  venue_postcode: string | null
  venue_address: string | null
  location: string | null
  start_time: string | null
  finish_time: string | null
  arrival_time: string | null
  load_out_time: string | null
  guests: number | null
  food: 'yes' | 'no' | 'tbc' | null
  food_notes: string | null
  dress_code: string | null
  dress_code_template_id: string | null
  id_required: boolean | null
  booked_band_template_id: string | null
  booked_lineup: string | null
  booked_sets: string | null
  band_size_requested: string | null
  sets_requested: string | null
  special_requirements: string | null
  sound_requirements: string | null
  notes: string | null
  roaming_requested: boolean
}

// Autosaves the full edit form — called on every debounced field change, so it
// must not redirect (the caller stays on the edit page for the whole session).
export async function updateEvent(eventId: string, data: UpdateEventData) {
  const supabase = createServiceClient()

  const requestDetails = (data.band_size_requested || data.sets_requested || data.special_requirements || data.sound_requirements || data.notes || data.roaming_requested)
    ? {
        band_size_requested: data.band_size_requested,
        sets_requested: data.sets_requested,
        special_requirements: data.special_requirements,
        sound_requirements: data.sound_requirements,
        notes: data.notes,
        roaming_requested: data.roaming_requested || null,
      }
    : null

  const { error } = await supabase
    .from('events')
    .update({
      is_agency: data.is_agency,
      agency_name: data.is_agency ? data.agency_name : null,
      agent_name: data.is_agency ? data.agent_name : null,
      agent_first_name: data.agent_first_name,
      agent_surname: data.agent_surname,
      client_email: data.client_email,
      client_phone: data.client_phone,
      source: data.source,
      source_job_url: data.source_job_url,
      event_date: data.event_date,
      venue_name: data.venue_name,
      venue_postcode: data.venue_postcode,
      venue_address: data.venue_address,
      location: data.location,
      start_time: data.start_time,
      finish_time: data.finish_time,
      arrival_time: data.arrival_time,
      load_out_time: data.load_out_time,
      guests: data.guests,
      food: data.food,
      food_notes: data.food_notes,
      dress_code: data.dress_code,
      dress_code_template_id: data.dress_code_template_id,
      id_required: data.id_required,
      booked_band_template_id: data.booked_band_template_id,
      booked_lineup: data.booked_lineup,
      booked_sets: data.booked_sets,
      request_details: requestDetails,
    })
    .eq('id', eventId)

  if (error) throw error

  revalidatePath(`/admin/events/${eventId}`)
  revalidatePath('/admin/events')
}

export async function createEvent(formData: FormData) {
  const supabase = createServiceClient()

  const str = (key: string) => (formData.get(key) as string)?.trim() || null
  const time = (key: string) => (formData.get(key) as string) || null

  const isAgency = formData.get('is_agency') === 'true'
  const guestsRaw = formData.get('guests') as string
  const bookedFeeRaw = formData.get('booked_fee') as string
  const statusRaw = formData.get('status') as string
  const status: EventStatus = EVENT_STATUSES.some(s => s.value === statusRaw) ? (statusRaw as EventStatus) : 'enquiry'

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
      dress_code_template_id: str('dress_code_template_id'),
      food: str('food') as 'yes' | 'no' | 'tbc' | null,
      food_notes: str('food_notes'),
      id_required: (() => { const v = str('id_required'); return v === 'yes' ? true : v === 'no' ? false : null })(),
      source: str('source'),
      source_job_url: str('source_job_url'),
      request_details: requestDetails,
      status,
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
  await logEventActivity(eventId, { type: 'contract_change', summary: `Attached ${attachment.name}` })
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
