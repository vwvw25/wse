import { createServiceClient } from '@/lib/supabase'
import type { EventRecord } from '@/types/quote'
import type { EventMusician, Musician } from '@/types/musicians'
import BandBuilderClient from './BandBuilderClient'

export default async function BandBuilderPage() {
  const supabase = createServiceClient()

  const [{ data: eventsData }, { data: slotsData }, { data: musiciansData }] = await Promise.all([
    supabase
      .from('events')
      .select('id, agency_name, agent_name, event_date, status')
      .not('status', 'in', '(client_declined,cancelled)')
      .order('event_date', { ascending: true }),
    supabase.from('event_musicians').select('*').order('date_added'),
    supabase.from('musicians').select('*').order('first_name,last_name'),
  ])

  const allEvents = (eventsData ?? []) as Pick<EventRecord, 'id' | 'agency_name' | 'agent_name' | 'event_date' | 'status'>[]
  const allSlots = (slotsData ?? []) as EventMusician[]
  const musicians = (musiciansData ?? []) as Musician[]

  // Show all upcoming events — slots will be empty for events with no assignments yet
  const events = allEvents.map(ev => ({
    ...ev,
    slots: allSlots.filter(s => s.event_id === ev.id),
  }))

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Band Builder</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Overview of musician assignments across upcoming events.
          </p>
        </div>
        <a
          href="/admin/musicians"
          style={{
            display: 'inline-block', padding: '7px 16px', fontSize: 13,
            background: 'var(--bg-secondary)', color: 'var(--text)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
          }}
        >
          Manage roster &amp; templates
        </a>
      </div>

      <BandBuilderClient events={events} musicians={musicians} />
    </div>
  )
}
