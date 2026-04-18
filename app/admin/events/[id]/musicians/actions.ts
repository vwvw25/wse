'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase'
import type { MusicianAvailability } from '@/types/musicians'

function paths(eventId: string) {
  revalidatePath(`/admin/events/${eventId}/musicians`)
  revalidatePath('/admin/band-builder')
}

// Apply a band template to an event — adds slots not already present
export async function applyTemplateToEvent(eventId: string, templateId: string) {
  const supabase = createServiceClient()

  // Get template slots
  const { data: slots } = await supabase
    .from('band_template_slots')
    .select('instrument')
    .eq('template_id', templateId)
    .order('sort_order')

  if (!slots?.length) return

  // Get existing instruments on this event
  const { data: existing } = await supabase
    .from('event_musicians')
    .select('instrument')
    .eq('event_id', eventId)

  const existingInstruments = new Set((existing ?? []).map(r => r.instrument.toLowerCase()))

  const toAdd = slots.filter(s => !existingInstruments.has(s.instrument.toLowerCase()))
  if (!toAdd.length) return

  await supabase.from('event_musicians').insert(
    toAdd.map(s => ({
      event_id: eventId,
      instrument: s.instrument,
      musician_id: null,
      fee: 0,
      additional_costs: 0,
      availability: 'tbc',
    })),
  )

  paths(eventId)
}

// Add a single instrument slot to an event
export async function addEventMusicianSlot(eventId: string, instrument: string) {
  const supabase = createServiceClient()
  await supabase.from('event_musicians').insert({
    event_id: eventId,
    instrument: instrument.trim(),
    musician_id: null,
    fee: 0,
    additional_costs: 0,
    availability: 'tbc',
  })
  paths(eventId)
}

// Assign a musician to a slot (or clear it)
export async function assignMusicianToSlot(
  slotId: string,
  eventId: string,
  musicianId: string | null,
  fee: number,
) {
  const supabase = createServiceClient()
  await supabase
    .from('event_musicians')
    .update({ musician_id: musicianId, fee })
    .eq('id', slotId)
  paths(eventId)
}

// Update availability for a slot
export async function updateSlotAvailability(
  slotId: string,
  eventId: string,
  availability: MusicianAvailability,
) {
  const supabase = createServiceClient()
  await supabase.from('event_musicians').update({ availability }).eq('id', slotId)
  paths(eventId)
}

// Update fee / additional costs for a slot
export async function updateSlotFees(
  slotId: string,
  eventId: string,
  fee: number,
  additionalCosts: number,
) {
  const supabase = createServiceClient()
  await supabase
    .from('event_musicians')
    .update({ fee, additional_costs: additionalCosts })
    .eq('id', slotId)
  paths(eventId)
}

// Update deadline hours for a slot
export async function updateSlotDeadline(slotId: string, eventId: string, deadlineHours: number) {
  const supabase = createServiceClient()
  await supabase.from('event_musicians').update({ deadline_hours: deadlineHours }).eq('id', slotId)
  paths(eventId)
}

// Remove a slot from an event
export async function removeEventMusicianSlot(slotId: string, eventId: string) {
  const supabase = createServiceClient()
  await supabase.from('event_musicians').delete().eq('id', slotId)
  paths(eventId)
}
