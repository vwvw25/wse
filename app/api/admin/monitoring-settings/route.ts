import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('monitoring_settings').select('*').eq('id', 1).single()
  if (error) {
    console.error('monitoring-settings fetch error:', error)
    return NextResponse.json({}, { status: 500 })
  }
  return NextResponse.json(data ?? {})
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json() as { alert_email?: string; delivery_threshold_minutes?: number; pending_threshold_minutes?: number; test_email_address?: string }
  const { error } = await supabase.from('monitoring_settings').upsert({ id: 1, ...body })
  if (error) {
    console.error('monitoring-settings save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
