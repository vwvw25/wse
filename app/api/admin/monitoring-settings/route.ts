import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('monitoring_settings').select('*').eq('id', 1).single()
  return NextResponse.json(data ?? {})
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json() as { alert_email?: string; delivery_threshold_minutes?: number; pending_threshold_minutes?: number }
  await supabase.from('monitoring_settings').upsert({ id: 1, ...body })
  return NextResponse.json({ ok: true })
}
