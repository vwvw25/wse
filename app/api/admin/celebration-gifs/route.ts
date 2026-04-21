import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('celebration_gifs')
    .select('id, url')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { url } = await req.json() as { url: string }
  if (!url?.trim()) return NextResponse.json({ error: 'url is required' }, { status: 400 })
  const { data, error } = await supabase
    .from('celebration_gifs')
    .insert({ url: url.trim() })
    .select('id, url')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
