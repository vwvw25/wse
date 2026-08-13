import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const BUCKET = 'av-riders'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data: rider } = await supabase.from('av_riders').select('file_path').eq('id', id).single()
  if (!rider?.file_path) return NextResponse.json({ error: 'No file on this rider' }, { status: 404 })
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(rider.file_path, 60 * 60)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl })
}
