import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { EventRecord } from '@/types/quote'
import type { BandTemplate, BandTemplateSlot } from '@/types/musicians'
import EditEventForm from './EditEventForm'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data }, { data: templatesData }, { data: templateSlotsData }, { data: invData }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('band_templates').select('*').order('name'),
    supabase.from('band_template_slots').select('*').order('sort_order'),
    supabase.from('invoice_settings').select('booking_sources').single(),
  ])

  if (!data) notFound()

  const event = data as EventRecord
  const templates = ((templatesData ?? []) as BandTemplate[]).map(t => ({
    ...t,
    slots: ((templateSlotsData ?? []) as BandTemplateSlot[]).filter(s => s.template_id === t.id),
  }))

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', maxWidth: 800 }}>
      <a href={`/admin/events/${id}`} style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Event</a>

      <div style={{ margin: '16px 0 28px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Edit event</h1>
      </div>

      <EditEventForm
    event={event}
    templates={templates}
    sources={(invData as { booking_sources?: string[] | null } | null)?.booking_sources ?? ['Encore', 'Poptop', 'Last Minute Musicians', 'Website']}
  />
    </div>
  )
}
