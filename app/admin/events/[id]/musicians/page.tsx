import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { EventRecord } from '@/types/quote'
import type { EventMusician, Musician, BandTemplate, BandTemplateSlot, CascadeTemplate } from '@/types/musicians'
import EventMusiciansClient from './EventMusiciansClient'

function formatDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function EventMusiciansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [
    { data: eventData },
    { data: slotsData },
    { data: musiciansData },
    { data: templatesData },
    { data: templateSlotsData },
    { data: cascadeTemplatesData },
  ] = await Promise.all([
    supabase.from('events').select('id, agency_name, agent_name, event_date, food').eq('id', id).single(),
    supabase.from('event_musicians').select('*, invites:musician_invites(*)').eq('event_id', id).order('date_added').order('id'),
    supabase.from('musicians').select('*').order('first_name').order('last_name'),
    supabase.from('band_templates').select('*').order('name'),
    supabase.from('band_template_slots').select('*').order('sort_order'),
    supabase.from('cascade_templates').select('*').order('instrument').order('name'),
  ])

  if (!eventData) notFound()

  const event = eventData as Pick<EventRecord, 'id' | 'agency_name' | 'agent_name' | 'event_date' | 'food'>
  const slots = (slotsData ?? []) as EventMusician[]
  const musicians = (musiciansData ?? []) as Musician[]
  const templates = (templatesData ?? []) as BandTemplate[]
  const templateSlots = (templateSlotsData ?? []) as BandTemplateSlot[]
  const cascadeTemplates = (cascadeTemplatesData ?? []) as CascadeTemplate[]

  const templatesWithSlots = templates.map(t => ({
    ...t,
    slots: templateSlots.filter(s => s.template_id === t.id),
  }))

  // Enrich slots: attach musician + latest invite for current musician
  const enrichedSlots: EventMusician[] = slots.map(s => {
    const allInvites = (s.invites ?? []) as import('@/types/musicians').MusicianInvite[]
    const forCurrentMusician = s.musician_id
      ? allInvites.filter(i => i.musician_id === s.musician_id)
      : []
    const latestInvite = forCurrentMusician.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] ?? null
    return {
      ...s,
      musician: s.musician_id ? (musicians.find(m => m.id === s.musician_id) ?? null) : null,
      latest_invite: latestInvite,
    }
  })

  const eventLabel = event.agency_name
    ? (event.agent_name ? `${event.agent_name} at ${event.agency_name}` : event.agency_name)
    : (event.agent_name ?? 'Unknown')

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, alignItems: 'center' }}>
        <a href="/admin/events" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Events</a>
        <span style={{ opacity: 0.4 }}>›</span>
        <a href={`/admin/events/${id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{eventLabel}</a>
        <span style={{ opacity: 0.4 }}>›</span>
        <span>Musicians</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>
            {eventLabel}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Musicians · {formatDate(event.event_date)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href="/admin/band-builder"
            style={{
              display: 'inline-block', padding: '7px 14px', fontSize: 13,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
            }}
          >
            Band builder overview
          </a>
          <a
            href="/admin/musicians"
            style={{
              display: 'inline-block', padding: '7px 14px', fontSize: 13,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
            }}
          >
            Manage roster
          </a>
        </div>
      </div>

      <EventMusiciansClient
        eventId={id}
        eventLabel={eventLabel}
        eventFood={event.food ?? null}
        slots={enrichedSlots}
        musicians={musicians}
        templates={templatesWithSlots}
        cascadeTemplates={cascadeTemplates}
      />
    </div>
  )
}
