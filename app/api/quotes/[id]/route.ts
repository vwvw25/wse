import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { calculate, DEFAULT_SETTINGS } from '@/lib/calculations'
import type { QuoteInputs, Settings } from '@/types/quote'
import { logEventActivity } from '@/lib/event-activity'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { inputs }: { inputs: QuoteInputs } = await req.json()
    const supabase = createServiceClient()

    // Fetch current settings
    const { data: settingsRow } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single()

    const settings: Settings = { ...DEFAULT_SETTINGS, ...(settingsRow ?? {}) }

    // Recalculate
    const calculated = calculate(inputs, settings)

    // Update quote
    const { data: updated, error } = await supabase
      .from('quotes')
      .update({ inputs, calculated, settings_snapshot: settings })
      .eq('id', id)
      .select('event_id')
      .single()

    if (error) throw error

    if (updated?.event_id) {
      await logEventActivity(updated.event_id, { type: 'quote_change', summary: 'Quote edited' })
    }

    return NextResponse.json({ id })
  } catch (err) {
    console.error('Quote update error:', err)
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
  }
}
