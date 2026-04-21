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

function normaliseGifUrl(raw: string): string {
  // Convert Giphy page URL → direct media URL
  // https://giphy.com/gifs/slug-GIPHYID  →  https://media.giphy.com/media/GIPHYID/giphy.gif
  const giphyPage = raw.match(/giphy\.com\/gifs\/(?:[^/]+-)?([a-zA-Z0-9]+)\/?$/)
  if (giphyPage) return `https://media.giphy.com/media/${giphyPage[1]}/giphy.gif`
  return raw
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const { url } = await req.json() as { url: string }
  if (!url?.trim()) return NextResponse.json({ error: 'url is required' }, { status: 400 })
  const { data, error } = await supabase
    .from('celebration_gifs')
    .insert({ url: normaliseGifUrl(url.trim()) })
    .select('id, url')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
