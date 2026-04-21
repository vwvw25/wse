import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const idx = parseInt(id)
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('monitoring_settings')
    .select('celebration_gif_urls')
    .eq('id', 1)
    .single()

  const urls = (data?.celebration_gif_urls as string[] | null) ?? []
  const newUrls = urls.filter((_, i) => i !== idx)

  await supabase
    .from('monitoring_settings')
    .upsert({ id: 1, celebration_gif_urls: newUrls })

  return NextResponse.json({ ok: true })
}
