import { createServiceClient } from '@/lib/supabase'
import type { Musician, BandTemplate, BandTemplateSlot, CascadeTemplate, CascadeTemplateMusicianEntry, OnboardingToken, EventMusician } from '@/types/musicians'
import type { EventRecord } from '@/types/quote'
import MusiciansPageClient from './MusiciansPageClient'

export default async function MusiciansPage() {
  const supabase = createServiceClient()

  const [
    { data: musiciansData },
    { data: templatesData },
    { data: slotsData },
    { data: cascadeTemplatesData },
    { data: cascadeMusiciansData },
    { data: tokensData },
    { data: eventsData },
    { data: eventSlotsData },
  ] = await Promise.all([
    supabase.from('musicians').select('*').order('first_name').order('last_name'),
    supabase.from('band_templates').select('*').order('created_at'),
    supabase.from('band_template_slots').select('*').order('sort_order'),
    supabase.from('cascade_templates').select('*').order('instrument').order('name'),
    supabase.from('cascade_template_musicians').select('*, musician:musicians(*)').order('rank'),
    supabase.from('musician_onboarding_tokens').select('*, musician:musicians(id,first_name,last_name,email)').order('created_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, agency_name, agent_name, event_date, status')
      .not('status', 'in', '(client_declined,cancelled)')
      .order('event_date', { ascending: true }),
    supabase.from('event_musicians').select('*').order('date_added'),
  ])

  const musicians = (musiciansData ?? []) as Musician[]
  const templates = (templatesData ?? []) as BandTemplate[]
  const slots = (slotsData ?? []) as BandTemplateSlot[]
  const rawCascadeTemplates = (cascadeTemplatesData ?? []) as CascadeTemplate[]
  const rawCascadeMusicians = (cascadeMusiciansData ?? []) as CascadeTemplateMusicianEntry[]
  const onboardingTokens = (tokensData ?? []) as OnboardingToken[]

  const templatesWithSlots = templates.map(t => ({
    ...t,
    slots: slots.filter(s => s.template_id === t.id),
  }))

  const cascadeTemplates: CascadeTemplate[] = rawCascadeTemplates.map(t => ({
    ...t,
    musicians: rawCascadeMusicians.filter(m => m.template_id === t.id),
  }))

  const allEvents = (eventsData ?? []) as Pick<EventRecord, 'id' | 'agency_name' | 'agent_name' | 'event_date' | 'status'>[]
  const allEventSlots = (eventSlotsData ?? []) as EventMusician[]

  const events = allEvents.map(ev => ({
    ...ev,
    slots: allEventSlots.filter(s => s.event_id === ev.id),
  }))

  return (
    <MusiciansPageClient
      musicians={musicians}
      templates={templatesWithSlots}
      cascadeTemplates={cascadeTemplates}
      onboardingTokens={onboardingTokens}
      events={events}
    />
  )
}
