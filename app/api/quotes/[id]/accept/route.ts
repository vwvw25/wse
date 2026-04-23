import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { accepted_option } = await req.json() as { accepted_option: string }

  if (!accepted_option?.trim()) {
    return NextResponse.json({ error: 'accepted_option is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_option: accepted_option.trim() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// Undo accepted — revert to 'sent' and clear accepted_option
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'sent', accepted_option: null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
