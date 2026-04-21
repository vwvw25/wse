import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('invoice_settings').select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  // Only allow updating safe fields (not year_counters)
  const allowed = [
    'vat_registered', 'vat_number',
    'bank_name', 'account_name', 'sort_code', 'account_number', 'iban', 'swift',
    'logo_url', 'default_notes',
  ]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { data: existing } = await supabase.from('invoice_settings').select('id').single()
  if (!existing) return NextResponse.json({ error: 'Settings not found' }, { status: 404 })

  const { error } = await supabase.from('invoice_settings').update(update).eq('id', existing.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
