import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { logEventActivity } from '@/lib/event-activity'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  // Fetch the source quote
  const { data: source, error: fetchErr } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !source) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  // Mark source as superseded
  await supabase
    .from('quotes')
    .update({ status: 'superseded' })
    .eq('id', id)

  // Create new version
  const { data: newQuote, error: insertErr } = await supabase
    .from('quotes')
    .insert({
      inputs: source.inputs,
      calculated: source.calculated,
      settings_snapshot: source.settings_snapshot,
      event_id: source.event_id ?? null,
      version: (source.version ?? 1) + 1,
      status: 'draft',
    })
    .select('id')
    .single()

  if (insertErr || !newQuote) {
    return NextResponse.json({ error: 'Failed to create new version' }, { status: 500 })
  }

  if (source.event_id) {
    await logEventActivity(source.event_id, { type: 'quote_change', summary: `Quote revised to v${(source.version ?? 1) + 1}` })
  }

  return NextResponse.json({ id: newQuote.id })
}
