import { createServiceClient } from '@/lib/supabase'
import type { Musician, BandTemplate, BandTemplateSlot, PreferenceOrder } from '@/types/musicians'
import MusicianClient from './MusicianClient'

export default async function MusiciansPage() {
  const supabase = createServiceClient()

  const [{ data: musiciansData }, { data: templatesData }, { data: slotsData }, { data: prefData }] = await Promise.all([
    supabase.from('musicians').select('*').order('first_name').order('last_name'),
    supabase.from('band_templates').select('*').order('created_at'),
    supabase.from('band_template_slots').select('*').order('sort_order'),
    supabase.from('preference_orders').select('*').order('rank'),
  ])

  const musicians = (musiciansData ?? []) as Musician[]
  const templates = (templatesData ?? []) as BandTemplate[]
  const slots = (slotsData ?? []) as BandTemplateSlot[]
  const preferenceOrders = (prefData ?? []) as PreferenceOrder[]

  const templatesWithSlots = templates.map(t => ({
    ...t,
    slots: slots.filter(s => s.template_id === t.id),
  }))

  return (
    <div>
      <div style={{ padding: '32px 32px 0', maxWidth: 920 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Musicians</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Manage your musician roster and band lineup templates.
        </p>
      </div>
      <MusicianClient musicians={musicians} templates={templatesWithSlots} preferenceOrders={preferenceOrders} />
    </div>
  )
}
