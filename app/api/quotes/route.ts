import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { calculate, DEFAULT_SETTINGS } from '@/lib/calculations'
import type { QuoteInputs, Settings } from '@/types/quote'
import { logEventActivity } from '@/lib/event-activity'

export async function POST(req: NextRequest) {
  try {
    const { inputs, event_id, quote_request_id }: { inputs: QuoteInputs; event_id?: string; quote_request_id?: string } = await req.json()
    const supabase = createServiceClient()

    // Fetch current settings
    const { data: settingsRow } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single()

    const settings: Settings = { ...DEFAULT_SETTINGS, ...(settingsRow ?? {}) }

    // Run calculation
    const calculated = calculate(inputs, settings)

    // Save quote
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        inputs,
        calculated,
        settings_snapshot: settings,
        version: 1,
        status: 'sent',
        ...(event_id ? { event_id } : {}),
      })
      .select('id')
      .single()

    if (error) throw error

    // Update event status to 'quoted' if linked
    if (event_id) {
      await supabase
        .from('events')
        .update({ status: 'quoted' })
        .eq('id', event_id)
      await logEventActivity(event_id, { type: 'quote_change', summary: 'Quote sent' })
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('Quote generation error:', err)
    return NextResponse.json({ error: 'Failed to generate quote' }, { status: 500 })
  }
}
