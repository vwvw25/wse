import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

async function getUrls(): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('monitoring_settings')
    .select('celebration_gif_urls')
    .eq('id', 1)
    .single()
  return (data?.celebration_gif_urls as string[] | null) ?? []
}

async function setUrls(urls: string[]) {
  const supabase = createServiceClient()
  await supabase
    .from('monitoring_settings')
    .upsert({ id: 1, celebration_gif_urls: urls })
}

export async function GET() {
  const urls = await getUrls()
  // Return as array of objects so the UI can use index as id
  return NextResponse.json(urls.map((url, i) => ({ id: String(i), url })))
}

export async function POST(req: NextRequest) {
  const { url } = await req.json() as { url: string }
  if (!url?.trim()) return NextResponse.json({ error: 'url is required' }, { status: 400 })
  const urls = await getUrls()
  const newUrls = [...urls, url.trim()]
  await setUrls(newUrls)
  return NextResponse.json({ id: String(newUrls.length - 1), url: url.trim() })
}
