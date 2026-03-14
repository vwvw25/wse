import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { calculate, DEFAULT_SETTINGS } from '@/lib/calculations'
import type { QuoteInputs, Settings } from '@/types/quote'

export async function POST(req: NextRequest) {
  try {
    const { inputs }: { inputs: QuoteInputs } = await req.json()
    const supabase = createServiceClient()

    // Fetch current settings (fall back to defaults if not in DB)
    const { data: settingsRow } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single()

    const settings: Settings = settingsRow ?? DEFAULT_SETTINGS

    // Run calculation
    const calculated = calculate(inputs, settings)

    // Save quote
    const { data, error } = await supabase
      .from('quotes')
      .insert({ inputs, calculated, settings_snapshot: settings })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('Quote generation error:', err)
    return NextResponse.json({ error: 'Failed to generate quote' }, { status: 500 })
  }
}
