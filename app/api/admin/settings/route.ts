import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { DEFAULT_SETTINGS } from '@/lib/calculations'
import type { Settings } from '@/types/quote'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error || !data) {
    return NextResponse.json(DEFAULT_SETTINGS)
  }

  // Exclude the id field from the response
  const { id: _id, ...settings } = data as { id: number } & Settings
  return NextResponse.json(settings)
}

export async function POST(request: NextRequest) {
  const body = await request.json() as Settings
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('settings')
    .upsert({ id: 1, ...body })
    .eq('id', 1)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { id: _id, ...settings } = data as { id: number } & Settings
  return NextResponse.json(settings)
}
