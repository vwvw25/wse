import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET  → { templates: WhySuitedTemplate[], prompt: string }
// POST → create a template  { name, body }
// PATCH → update the ChatGPT prompt wording  { prompt }

export async function GET() {
  const supabase = createServiceClient()
  const [{ data: templates }, { data: settings }] = await Promise.all([
    supabase.from('why_suited_templates').select('*').order('name'),
    supabase.from('why_suited_settings').select('prompt').eq('id', 1).single(),
  ])
  return NextResponse.json({
    templates: templates ?? [],
    prompt: settings?.prompt ?? '',
  })
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { name, body } = await req.json() as { name?: string; body?: string }
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('why_suited_templates')
    .insert({ name: name.trim(), body: body ?? '' })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createServiceClient()
  const { prompt } = await req.json() as { prompt?: string }
  const { error } = await supabase
    .from('why_suited_settings')
    .upsert({ id: 1, prompt: prompt ?? '' })
    .eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
