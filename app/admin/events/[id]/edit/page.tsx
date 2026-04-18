import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { EventRecord } from '@/types/quote'
import EditEventForm from './EditEventForm'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data } = await supabase.from('events').select('*').eq('id', id).single()
  if (!data) notFound()

  const event = data as EventRecord

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', maxWidth: 800 }}>
      <a href={`/admin/events/${id}`} style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Event</a>

      <div style={{ margin: '16px 0 28px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Edit event</h1>
      </div>

      <EditEventForm event={event} />
    </div>
  )
}
