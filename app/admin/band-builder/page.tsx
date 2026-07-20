import { createServiceClient } from '@/lib/supabase'
import type { BandTemplate, BandTemplateSlot } from '@/types/musicians'
import BandTemplatesClient from './BandTemplatesClient'

export default async function BandBuilderPage() {
  const supabase = createServiceClient()

  const [{ data: templatesData }, { data: slotsData }] = await Promise.all([
    supabase.from('band_templates').select('*').order('created_at'),
    supabase.from('band_template_slots').select('*').order('sort_order'),
  ])

  const templates = (templatesData ?? []) as BandTemplate[]
  const slots = (slotsData ?? []) as BandTemplateSlot[]

  const templatesWithSlots = templates.map(t => ({
    ...t,
    slots: slots.filter(s => s.template_id === t.id),
  }))

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Band Builder</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Reusable instrument line-ups you can apply to an event in one click.
          </p>
        </div>
        <a
          href="/admin/events?view=band-builder"
          style={{
            display: 'inline-block', padding: '7px 16px', fontSize: 13,
            background: 'var(--bg-secondary)', color: 'var(--text)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
          }}
        >
          View assignments overview
        </a>
      </div>

      <BandTemplatesClient templates={templatesWithSlots} />
    </div>
  )
}
