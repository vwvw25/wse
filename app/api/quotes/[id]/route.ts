import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { calculate, DEFAULT_SETTINGS } from '@/lib/calculations'
import type { QuoteInputs, Settings } from '@/types/quote'

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
    const { error } = await supabase
      .from('quotes')
      .update({ inputs, calculated, settings_snapshot: settings })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ id })
  } catch (err) {
    console.error('Quote update error:', err)
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
  }
}
