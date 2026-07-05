import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { logEventActivity } from '@/lib/event-activity'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { accepted_option } = await req.json() as { accepted_option: string }

  if (!accepted_option?.trim()) {
    return NextResponse.json({ error: 'accepted_option is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_option: accepted_option.trim() })
    .eq('id', id)
    .select('event_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (data?.event_id) {
    await logEventActivity(data.event_id, { type: 'quote_change', summary: `Quote accepted (${accepted_option.trim()})` })
  }

  return NextResponse.json({ ok: true })
}

// Undo accepted — revert to 'sent' and clear accepted_option
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('quotes')
    .update({ status: 'sent', accepted_option: null })
    .eq('id', id)
    .select('event_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (data?.event_id) {
    await logEventActivity(data.event_id, { type: 'quote_change', summary: 'Quote acceptance undone' })
  }

  return NextResponse.json({ ok: true })
}
